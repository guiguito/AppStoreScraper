const { AppStoreClient } = require('app-store-client');

const client = new AppStoreClient();

async function testApp() {
  const combinations = [
    { country: 'FR', language: 'fr' },
    { country: 'US', language: 'en' },
    { country: 'FR', language: 'en' },
  ];

  for (const { country, language } of combinations) {
    console.log(`Testing with country: ${country}, language: ${language}`);
    try {
      const appData = await client.app({
        id: '6480469576',
        country,
        language
      });
      console.log('Success! App data:', appData.title);
      return; // Found a working combination
    } catch (error) {
      console.error(`Error with ${country}/${language}:`, error.message);
    }
  }
}

testApp();
