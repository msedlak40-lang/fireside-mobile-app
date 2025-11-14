// test_models.mjs
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const models = [
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307',
  'claude-3-5-sonnet-20240620',
  'claude-3-5-sonnet-20241022'
];

console.log('Testing which Claude models are available to your API key...\n');

for (const model of models) {
  try {
    console.log(`Testing ${model}...`);
    const message = await anthropic.messages.create({
      model: model,
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Hi' }]
    });
    console.log(`✅ ${model} WORKS!\n`);
  } catch (error) {
    console.log(`❌ ${model} FAILED: ${error.status} - ${error.message}\n`);
  }
}

console.log('Test complete!');
