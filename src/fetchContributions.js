import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USERNAME = process.env.GITHUB_USER || 'ishangupta1412';

function getGitHubToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    const token = execSync('"C:\\Program Files\\GitHub CLI\\gh.exe" auth token', { encoding: 'utf8' }).trim();
    if (token) return token;
  } catch (e) {
    // gh CLI might not be present or logged in
  }
  return null;
}

async function fetchLiveContributions(token, username) {
  const query = `
    query($login: String!) {
      user(login: $login) {
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                contributionLevel
                date
                weekday
              }
            }
          }
        }
      }
    }
  `;

  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'PUBG-Contrib-Arena/1.0'
    },
    body: JSON.stringify({ query, variables: { login: username } })
  });

  const json = await res.json();
  if (json.errors) {
    throw new Error(JSON.stringify(json.errors));
  }
  return json.data.user.contributionsCollection.contributionCalendar;
}

function generateMockCalendar() {
  console.log('Generating realistic baseline contribution calendar...');
  const weeks = [];
  let totalContributions = 28;
  const today = new Date();

  for (let w = 51; w >= 0; w--) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(today);
      date.setDate(date.getDate() - (w * 7 + (6 - d)));
      const month = date.getMonth(); // 0-11

      let count = 0;
      let level = 'NONE';

      // Sparse tactical clusters matching Ishan's 2026 milestones:
      // July (hackathon prep), Sept (SIH 2026), Oct (MS Innovate 2026), Nov (launch)
      const isMilestonePeriod = (month === 6 && d === 2) || (month === 8 && d === 1) || (month === 9 && d === 3) || (month === 10);
      if (isMilestonePeriod) {
        if (month === 10) {
          count = (w % 3 === 0) ? Math.floor(Math.random() * 5 + 3) : Math.floor(Math.random() * 3 + 1);
        } else {
          count = Math.floor(Math.random() * 4 + 1);
        }
      } else if (Math.random() < 0.08) {
        count = Math.floor(Math.random() * 2 + 1);
      }

      if (count > 0) {
        totalContributions += count;
        if (count >= 5) level = 'FOURTH_QUARTILE';
        else if (count >= 3) level = 'THIRD_QUARTILE';
        else if (count >= 2) level = 'SECOND_QUARTILE';
        else level = 'FIRST_QUARTILE';
      }

      days.push({
        contributionCount: count,
        contributionLevel: level,
        date: date.toISOString().split('T')[0],
        weekday: d
      });
    }
    weeks.push({ contributionDays: days });
  }

  return { totalContributions, weeks };
}

async function main() {
  const token = getGitHubToken();
  let calendar = null;

  if (token) {
    try {
      console.log(`Fetching live GitHub contributions for @${USERNAME}...`);
      calendar = await fetchLiveContributions(token, USERNAME);
      console.log(`Live data fetched: ${calendar.totalContributions} contributions across ${calendar.weeks.length} weeks.`);
    } catch (err) {
      console.warn('Failed to fetch live data:', err.message);
    }
  }

  if (!calendar) {
    calendar = generateMockCalendar();
  }

  const outPath = path.join(__dirname, 'contributions.json');
  fs.writeFileSync(outPath, JSON.stringify(calendar, null, 2), 'utf8');
  console.log(`Saved contribution data to: ${outPath}`);
}

main().catch(console.error);
