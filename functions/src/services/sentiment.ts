import * as logger from 'firebase-functions/logger';
import { MISTRAL_API_KEY } from '../utils/countries.js';
import { SentimentAnalysisResponse, UnifiedReview } from '../utils/types.js';
import { db } from '../index.js';
import { Parser } from 'json2csv'; // Import json2csv Parser

export const analyzeSentiment = async (
  appId: string,
  country: string,
  reviews: UnifiedReview[],
  startDate: Date | null,
  endDate: Date | null
): Promise<SentimentAnalysisResponse> => {
  try {
    // Generate date strings for cache key, handling nulls
    const startDateStr = startDate ? startDate.toISOString().split('T')[0] : 'all';
    const endDateStr = endDate ? endDate.toISOString().split('T')[0] : 'all';
    const cacheKey = `${appId}-${country}-${startDateStr}-${endDateStr}`;

    // Check cache first using the date-specific key
    const cacheRef = db.collection('sentiment-cache').doc(cacheKey);
    const cacheDoc = await cacheRef.get();
    
    if (cacheDoc.exists) {
      const cachedData = cacheDoc.data() as any;
      const cacheAge = Date.now() - cachedData.lastUpdated.toDate().getTime();
      
      // Use cache if it's less than 24 hours old
      if (cacheAge < 24 * 60 * 60 * 1000) {
        logger.info(`Using cached sentiment analysis for app ${appId}`);
        return cachedData.analysis;
      }
    }

    // Filter reviews by date if specified
    let filteredReviews = reviews;
    if (startDate || endDate) {
      filteredReviews = reviews.filter(review => {
        // Use updated, date, or current time as fallback
        const reviewTimestamp = review.updated || review.date || new Date().toISOString();
        const reviewDate = new Date(reviewTimestamp);
        if (startDate && reviewDate < startDate) return false;
        if (endDate && reviewDate > endDate) return false;
        return true;
      });
    }

    // Prepare reviews for analysis as CSV
    const fields = ['text'];
    const json2csvParser = new Parser({ fields });
    const reviewTexts = json2csvParser.parse(filteredReviews);

    const prompt = `You are a Mobile Product Manager conducting a comprehensive sentiment analysis
    on the ${filteredReviews.length} reviews provided in the CSV data below.
    The CSV contains app store reviews. Focus on the content in the 'text' column.
    It is CRITICAL that you analyze EVERY single review provided. Do not be lazy or skip any reviews.
    Your analysis MUST cover the full dataset provided.

    Your task is to: Categorize with your own analysis (no external code and library)
    sentiment of reviews (from the 'text' column) into 4 distinct groups:
    Positive, Negative, Neutral, and Unknown sentiment.
    Count the number of reviews falling into each sentiment category and present the results
    in a structured format. Identify the top 5 recurring issues from negative and
    neutral reviews (found in the 'text' column).
    Summarize each issue and provide the number of occurrences.
    Provide insights on the overall sentiment distribution and any notable patterns found
    in the dataset (based on the 'text' column).
    Please provide your answers in english.
    Ensure your JSON response includes the total count of reviews provided in the 'InputReviewCount' field.
    CSV data with reviews to analyze:

${reviewTexts}`;

    // Log the count of reviews being sent
    logger.info({ message: `Sending ${filteredReviews.length} reviews for sentiment analysis.` });

    // Log the prompt before sending to Mistral API
    logger.info({ message: 'Sending prompt to Mistral API', prompt: prompt });

    // Call Mistral API for sentiment analysis
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [
          {
            role: 'system',
            content: 'You will analyze app store reviews and provide sentiment analysis.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            schema: {
              title: 'SentimentAnalysis',
              type: 'object',
              properties: {
                SentimentDistribution: {
                  title: 'Sentiment Distribution',
                  type: 'object',
                  properties: {
                    Positive: { title: 'Positive Reviews', type: 'integer', minimum: 0 },
                    Neutral: { title: 'Neutral Reviews', type: 'integer', minimum: 0 },
                    Negative: { title: 'Negative Reviews', type: 'integer', minimum: 0 },
                    Unknown: { title: 'Unknown sentiment Reviews', type: 'integer', minimum: 0 },
                  },
                  required: ['Positive', 'Neutral', 'Negative'], // Unknown is optional
                  additionalProperties: false,
                },
                TopIssues: {
                  title: 'Top Issues',
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      Issue: { title: 'Issue', type: 'string' },
                      Mentions: { title: 'Mentions Count', type: 'integer', minimum: 1 },
                      Description: { title: 'Issue Description', type: 'string' },
                    },
                    required: ['Issue', 'Mentions', 'Description'],
                    additionalProperties: false,
                  },
                },
                Insights: {
                  title: 'Insights',
                  type: 'object',
                  properties: {
                    OverallSentiment: { title: 'Overall Sentiment Summary', type: 'string' },
                    KeyPatterns: { title: 'Key Patterns Observed', type: 'array', items: { type: 'string' } },
                  },
                  additionalProperties: false,
                },
                InputReviewCount: { 
                  title: 'Total Reviews Provided to Analyze',
                  type: 'integer',
                  description: 'Total reviews in input CSV.',
                  minimum: 0,
                },
              },
              required: ['SentimentDistribution', 'TopIssues', 'Insights',
                'InputReviewCount'], // Make new field required
              additionalProperties: false,
            },
            name: 'sentiment_analysis',
            strict: true,
          },
        },
        max_tokens: 1024,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.statusText}`);
    }

    const result = await response.json();
    logger.info({ message: 'Received response from Mistral API', response: result }); // Log the raw response
    const analysis = JSON.parse(result.choices[0].message.content) as SentimentAnalysisResponse;

    // Cache the results using the date-specific key
    await cacheRef.set({
      appId,
      country,
      startDate: startDateStr, // Store date strings in cache doc for clarity
      endDate: endDateStr,
      analysis,
      lastUpdated: new Date(),
    });

    return analysis;
  } catch (error) {
    logger.error('Error in sentiment analysis:', error);
    throw error;
  }
};
