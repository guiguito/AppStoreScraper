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
        const reviewDate = new Date(review.updated);
        if (startDate && reviewDate < startDate) return false;
        if (endDate && reviewDate > endDate) return false;
        return true;
      });
    }

    // Prepare reviews for analysis
    const reviewTexts = filteredReviews.map(review => review.text).join('\\n');

    // Call Mistral API for sentiment analysis
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'mistral-tiny',
        messages: [
          {
            role: 'system',
            content: 'You are a sentiment analysis expert. Analyze the following app reviews and provide ' +
              'sentiment distribution, top issues, and insights.',
          },
          {
            role: 'user',
            content: `Please analyze these app reviews and provide a structured response with sentiment
              distribution (positive/neutral/negative percentages), top issues mentioned (with counts),
               and key insights:\\n\\n${reviewTexts}`,
          },
        ],
        temperature: 0.3,
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
