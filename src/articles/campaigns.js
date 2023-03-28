export function downloadToText(campaigns) {
  // create a text file containing all campaigns separated by a newline
  let output = '';
  for (const campaign of campaigns) {
    console.log(campaign);
    output += campaign + '\n';
  }

  return new Blob([output], { type: 'text/plain' });
}

export function parseCampaignNames(urls, name) {
  let campaignsJS = [];
  for (const url of urls) {
    let campaignName = extractCampaignName(url, name);
    if (campaignName != null && campaignsJS.includes(campaignName) == false) {
      campaignsJS.push(campaignName);
    }
  }
  return campaignsJS;
}

function extractCampaignName(url, name) {
  const date =
    new Date().toLocaleString('default', { month: 'short' }) +
    new Date().getDate().toString().padStart(2, '0');
  const urlParts = url.split('/');
  for (let i = urlParts.length - 1; i >= 0; i--) {
    const part = urlParts[i];
    if (
      part.includes('-') &&
      !part.startsWith('http') &&
      !part.includes('%') &&
      !part.includes(',') &&
      !part.includes('.') &&
      !part.includes('&')
    ) {
      return `${part}-${name}-${date}`;
    }
  }
  return null;
}
