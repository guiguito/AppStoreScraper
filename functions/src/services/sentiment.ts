import * as logger from 'firebase-functions/logger';
import { MISTRAL_API_KEY } from '../utils/countries.js';
import { SentimentAnalysisResponse, CachedSentimentAnalysis, UnifiedReview } from '../utils/types.js';
import { db } from '../index.js';


export const analyzeSentiment = async (
  appId: string,
  country: string,
  reviews: UnifiedReview[],
  startDate: Date | null,
  endDate: Date | null
): Promise<SentimentAnalysisResponse> => {
  try {
    // Check cache first
    const cacheRef = db.collection('sentiment-cache').doc(`${appId}-${country}`);
    const cacheDoc = await cacheRef.get();
    
    if (cacheDoc.exists) {
      const cachedData = cacheDoc.data() as CachedSentimentAnalysis;
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

    // Prepare reviews for analysis
    const reviewTexts = filteredReviews.map(review => review.text).join('\\n');

    const prompt = `You are a Mobile Product Manager conducting a comprehensive sentiment analysis on the reviews below.
    Your task is to: Categorize with your own analysis (no external code and library)
    sentiment into three distinct groups:Positive, Negative, and Neutral based on the text reviews.
    Count the number of reviews falling into each sentiment category and present the results
    in a structured format. Identify the top 5 recurring issues from negative and neutral reviews.
    Summarize each issue and provide the number of occurrences.
    Provide insights on the overall sentiment distribution and any notable patterns found in the dataset.
    Please provide your answers in english.
    Reviews to analyze: ${reviewTexts}`;

    // Call Mistral API for sentiment analysis
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
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
                  },
                  required: ['Positive', 'Neutral', 'Negative'],
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
                    KeyPatterns: { title: 'Key Patterns', type: 'array', items: { type: 'string' } },
                  },
                  required: ['OverallSentiment', 'KeyPatterns'],
                  additionalProperties: false,
                },
              },
              required: ['SentimentDistribution', 'TopIssues', 'Insights'],
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
    const analysis = JSON.parse(result.choices[0].message.content) as SentimentAnalysisResponse;

    // Cache the results
    await cacheRef.set({
      appId,
      country,
      analysis,
      lastUpdated: new Date(),
    });

    return analysis;
  } catch (error) {
    logger.error('Error in sentiment analysis:', error);
    throw error;
  }
};
