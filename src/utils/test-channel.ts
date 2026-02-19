const API_KEY = "77721f1f-77ed-4b2c-a5d6-7b49d3db8294";
const BASE_URL = "https://ofis-api.kolaybi.com";

const channels = ["web", "api", "mobile", "integration", "erp", "pos"];

async function testChannels() {
  console.log("🔍 Testing all channel values...\n");

  for (const channel of channels) {
    try {
      console.log(`Testing channel: "${channel}"`);

      const res = await fetch(`${BASE_URL}/kolaybi/v1/access_token`, {
        method: "POST",
        headers: {
          Channel: channel,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ api_key: API_KEY }),
      });

      const data = await res.json();

      if (res.ok) {
        console.log(`✅ SUCCESS with channel: "${channel}"`);
        console.log(`Access Token: ${data.data}\n`);
        return channel;
      } else {
        console.log(`❌ Failed: ${data.message}`);
      }
    } catch (error: any) {
      console.log(`❌ Error: ${error.message}`);
    }
    console.log("---");
  }

  console.log("\n❌ None of the channels worked!");
}

testChannels();
