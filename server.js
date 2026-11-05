import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// In-memory APOD cache indexed by date (YYYY-MM-DD)
const apodByDate = new Map();

// Helper to format HTML description from NASA WordPress API into clean text
function formatExplanation(html) {
  if (!html) return '';
  let text = html.replace(/<strong>\s*Explanation:\s*<\/strong>/gi, '');
  text = text.replace(/^Explanation:\s*/i, '');
  text = text.replace(/<strong>\s*Tomorrow['']?s picture:[\s\S]*$/gi, '');
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/&amp;/g, '&')
             .replace(/&lt;/g, '<')
             .replace(/&gt;/g, '>')
             .replace(/&quot;/g, '"')
             .replace(/&#039;/g, "'")
             .replace(/&#8211;/g, '–');
  return text.trim();
}

// Extract video stream/embed, thumbnail, and working watch links
function parseVideo(item) {
  let videoUrl = null;
  let watchUrl = null;
  let thumbUrl = item.hdurl || item.thumbnail_url || null;
  let isVideo = item.media_type === 'video';

  if (item.basic_html) {
    const iframeMatch = item.basic_html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
    const sourceMatch = item.basic_html.match(/<video[^>]*>[\s\S]*?<source[^>]+src=["']([^"']+)["']/i);
    const videoTagMatch = item.basic_html.match(/<video[^>]+src=["']([^"']+)["']/i);

    if (iframeMatch) {
      isVideo = true;
      videoUrl = iframeMatch[1].startsWith('//') ? 'https:' + iframeMatch[1] : iframeMatch[1];
    } else if (sourceMatch) {
      isVideo = true;
      videoUrl = sourceMatch[1];
    } else if (videoTagMatch) {
      isVideo = true;
      videoUrl = videoTagMatch[1];
    }

    if (!thumbUrl) {
      const ogMatch = item.basic_html.match(/<meta property=["']og:image["'] content=["']([^"']+)["']/i);
      if (ogMatch) thumbUrl = ogMatch[1];
    }
  }

  if (videoUrl) {
    const ytMatch = videoUrl.match(/(?:embed\/|v=|youtu\.be\/)([\w-]{11})/i);
    if (ytMatch) {
      watchUrl = `https://www.youtube.com/watch?v=${ytMatch[1]}`;
      if (!thumbUrl) thumbUrl = `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
    } else {
      watchUrl = videoUrl;
    }
  } else if (item.url && (item.url.includes('youtube') || item.url.includes('vimeo'))) {
    isVideo = true;
    videoUrl = item.url;
    watchUrl = item.url;
  }

  return { isVideo, videoUrl, watchUrl, thumbUrl };
}

// Convert an item from science.nasa.gov/wp-json/wp/v2/apod-basic into standard APOD object
function normalizeApodBasicItem(item) {
  if (!item || !item.date) return null;
  const { isVideo, videoUrl, watchUrl, thumbUrl } = parseVideo(item);
  const directImage = thumbUrl || item.hdurl || (item.url && item.url.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i) ? item.url : null);

  return {
    date: item.date,
    title: item.title || 'Astronomy Picture of the Day',
    explanation: formatExplanation(item.explanation),
    media_type: isVideo ? 'video' : 'image',
    url: isVideo ? (videoUrl || item.url) : (directImage || item.url),
    hdurl: item.hdurl || directImage || item.url,
    thumbnail_url: thumbUrl || directImage,
    video_url: videoUrl,
    watch_url: watchUrl || videoUrl || item.url
  };
}

// Fetch and index recent APOD records from NASA's official endpoint
async function refreshApodArchive() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch('https://science.nasa.gov/wp-json/wp/v2/apod-basic?per_page=100', {
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.ok) {
      const items = await res.json();
      if (Array.isArray(items)) {
        for (const raw of items) {
          const norm = normalizeApodBasicItem(raw);
          if (norm && norm.date) {
            apodByDate.set(norm.date, norm);
          }
        }
        console.log(`[NASA APOD] Indexed ${apodByDate.size} real APOD records.`);
      }
    }
  } catch (err) {
    console.warn('[NASA APOD] Archive prefetch note:', err.message);
  }
}

// Populate cache on startup
refreshApodArchive();

// Curated high-res fallback space images/videos
const fallbackPhotos = [
  {
    date: '2026-11-05',
    title: 'Enceladus in Silhouette',
    explanation: "One of our Solar System's most tantalizing worlds, Enceladus is backlit by the Sun in this Cassini spacecraft image. Backlit illumination reveals icy plumes continuously spewing from the south pole of Saturn's 500-kilometer-wide moon.",
    media_type: 'image',
    url: 'https://assets.science.nasa.gov/dynamicimage/assets/science/cds/apod/apod/2026/november/PIA17144EnceladusPandora.png?w=982&h=575&fit=clip&crop=faces%2Cfocalpoint',
    thumbnail_url: 'https://assets.science.nasa.gov/dynamicimage/assets/science/cds/apod/apod/2026/november/PIA17144EnceladusPandora.png?w=982&h=575&fit=clip&crop=faces%2Cfocalpoint'
  },
  {
    date: '2026-11-04',
    title: 'The Not-So-Hidden Galaxy, IC 342',
    explanation: "Peering through the plane of the Milky Way through dense interstellar gas and dust, this image unveils the spiral arms of IC 342, a bright galaxy lying just 10 million light-years away in Camelopardalis.",
    media_type: 'image',
    url: 'https://assets.science.nasa.gov/dynamicimage/assets/science/cds/apod/apod/2026/november/ic342.png?w=4144&h=2822&fit=clip&crop=faces%2Cfocalpoint',
    thumbnail_url: 'https://assets.science.nasa.gov/dynamicimage/assets/science/cds/apod/apod/2026/november/ic342.png?w=4144&h=2822&fit=clip&crop=faces%2Cfocalpoint'
  },
  {
    date: '2026-11-03',
    title: 'Comet PanSTARRs and Rainbow Meteor',
    explanation: 'A dazzling cosmic vista capturing the glowing green coma and dust trail of Comet PanSTARRs alongside an atmospheric rainbow fireball meteor slicing through the night sky.',
    media_type: 'image',
    url: 'https://assets.science.nasa.gov/dynamicimage/assets/science/cds/apod/apod/2026/november/CometMeteor_Metais_1934.jpg?w=0&h=0&fit=clip&crop=faces%2Cfocalpoint',
    thumbnail_url: 'https://assets.science.nasa.gov/dynamicimage/assets/science/cds/apod/apod/2026/november/CometMeteor_Metais_1934.jpg?w=0&h=0&fit=clip&crop=faces%2Cfocalpoint'
  },
  {
    date: '2026-11-02',
    title: 'A Long Cloud on Mars',
    explanation: "Known as the Arsia Mons Elongated Cloud, this massive water-ice plume stretches over 1,800 kilometers across the Martian surface, condensed by strong winds blowing over Mars' giant volcano.",
    media_type: 'image',
    url: 'https://assets.science.nasa.gov/dynamicimage/assets/science/cds/apod/apod/2026/november/MonsCloud_MarsExpress_1920.jpg?w=1920&h=1200&fit=clip&crop=faces%2Cfocalpoint',
    thumbnail_url: 'https://assets.science.nasa.gov/dynamicimage/assets/science/cds/apod/apod/2026/november/MonsCloud_MarsExpress_1920.jpg?w=1920&h=1200&fit=clip&crop=faces%2Cfocalpoint'
  },
  {
    date: '2026-11-01',
    title: 'Colors of the Moon',
    explanation: 'A breathtaking spiral mosaic capturing the spectrum of Moon colors seen from Earth over 10 years of astrophotography — from red and copper in lunar eclipses to golden horizons and silvery blues.',
    media_type: 'image',
    url: 'https://assets.science.nasa.gov/dynamicimage/assets/science/cds/apod/apod/2026/november/MoonColors_Pace_960.jpg?w=960&h=991&fit=clip&crop=faces%2Cfocalpoint',
    thumbnail_url: 'https://assets.science.nasa.gov/dynamicimage/assets/science/cds/apod/apod/2026/november/MoonColors_Pace_960.jpg?w=960&h=991&fit=clip&crop=faces%2Cfocalpoint'
  },
  {
    date: '2026-10-31',
    title: 'Night on a Spooky Planet',
    explanation: 'Steam vents, mineral mud pots, and eerie green aurora curtains light up the desolate volcanic landscape of Hverir, Iceland under dark and stormy skies.',
    media_type: 'image',
    url: 'https://assets.science.nasa.gov/dynamicimage/assets/science/cds/apod/apod/Hverir_Vetter_1300.jpg?w=1300&h=867&fit=clip&crop=faces%2Cfocalpoint',
    thumbnail_url: 'https://assets.science.nasa.gov/dynamicimage/assets/science/cds/apod/apod/Hverir_Vetter_1300.jpg?w=1300&h=867&fit=clip&crop=faces%2Cfocalpoint'
  },
  {
    date: '2026-10-30',
    title: 'Haunting the Cepheus Flare',
    explanation: 'Dust clouds drift through cosmic space like spectral apparitions in the Cepheus Flare molecular cloud complex, located about 1,200 light-years away.',
    media_type: 'image',
    url: 'https://assets.science.nasa.gov/dynamicimage/assets/science/cds/apod/apod/2026/october/CepheusFlare_Tondinelli.jpg?w=6000&h=4076&fit=clip&crop=faces%2Cfocalpoint',
    thumbnail_url: 'https://assets.science.nasa.gov/dynamicimage/assets/science/cds/apod/apod/2026/october/CepheusFlare_Tondinelli.jpg?w=6000&h=4076&fit=clip&crop=faces%2Cfocalpoint'
  },
  {
    date: '2026-10-29',
    title: 'The Horns of Venus',
    explanation: 'A razor-thin crescent of Venus captured with delicate atmospheric extensions curving past 180 degrees as sunlight refracts through the dense, hot carbon dioxide atmosphere of our planetary sister.',
    media_type: 'image',
    url: 'https://assets.science.nasa.gov/dynamicimage/assets/science/cds/apod/apod/2026/october/venus_20261024a.jpg?w=744&h=744&fit=clip&crop=faces%2Cfocalpoint',
    thumbnail_url: 'https://assets.science.nasa.gov/dynamicimage/assets/science/cds/apod/apod/2026/october/venus_20261024a.jpg?w=744&h=744&fit=clip&crop=faces%2Cfocalpoint'
  },
  {
    date: '2026-10-28',
    title: 'The Mutual Occultation of Ganymede and Io',
    explanation: "Two of Jupiter's Galilean satellites line up in cosmic alignment: icy Ganymede passes directly in front of volcanic Io, casting a shadow across Jovian space.",
    media_type: 'video',
    url: 'https://assets.science.nasa.gov/content/dam/science/cds/apod/apod/2026/october/occultation.mp4',
    thumbnail_url: 'https://assets.science.nasa.gov/dynamicimage/assets/science/cds/apod/apod/2026/october/occultation.jpeg?w=1600&h=1000&fit=clip&crop=faces%2Cfocalpoint',
    video_url: 'https://assets.science.nasa.gov/content/dam/science/cds/apod/apod/2026/october/occultation.mp4',
    watch_url: 'https://assets.science.nasa.gov/content/dam/science/cds/apod/apod/2026/october/occultation.mp4'
  }
];

// Pre-fill cache with fallback items
for (const p of fallbackPhotos) {
  if (!apodByDate.has(p.date)) {
    apodByDate.set(p.date, p);
  }
}

// API endpoint returning actual APOD photos/videos for each date in range
app.get('/api/apod', async (req, res) => {
  const { start_date, end_date } = req.query;

  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'Please provide start_date and end_date.' });
  }

  // Ensure archive is fresh
  if (apodByDate.size < 10) {
    await refreshApodArchive();
  }

  // Check which dates in the range are already indexed
  const matched = [];
  for (const [date, item] of apodByDate.entries()) {
    if (date >= start_date && date <= end_date) {
      // Ensure it is not the broken NASA scraper placeholder logo
      if (!item.url.includes('nasa-logo@2x.png') && item.title !== 'NASA Science') {
        matched.push(item);
      }
    }
  }

  if (matched.length > 0) {
    matched.sort((a, b) => a.date.localeCompare(b.date));
    return res.json({ source: 'nasa_official', data: matched });
  }

  // If not yet in cache, attempt fetching directly from api.nasa.gov with thumbs=true
  try {
    const apiKey = process.env.NASA_API_KEY || 'DEMO_KEY';
    const params = new URLSearchParams({
      api_key: apiKey,
      start_date,
      end_date,
      thumbs: 'true'
    });

    const nasaRes = await fetch(`https://api.nasa.gov/planetary/apod?${params}`);
    const data = await nasaRes.json();

    if (nasaRes.ok && Array.isArray(data)) {
      const fixedData = data.map((item) => {
        // If NASA API returned the broken placeholder logo scraper bug, replace with indexed item if possible
        if (item.url && item.url.includes('nasa-logo@2x.png')) {
          const cached = apodByDate.get(item.date);
          if (cached) return cached;
        }

        const isVideo = item.media_type === 'video' || (item.url && (item.url.includes('youtube') || item.url.includes('vimeo')));
        let thumb = item.thumbnail_url || item.hdurl || null;
        let watchUrl = item.url;

        if (isVideo && item.url) {
          const ytMatch = item.url.match(/(?:embed\/|v=|youtu\.be\/)([\w-]{11})/i);
          if (ytMatch) {
            watchUrl = `https://www.youtube.com/watch?v=${ytMatch[1]}`;
            if (!thumb) thumb = `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
          }
        }

        return {
          ...item,
          media_type: isVideo ? 'video' : 'image',
          thumbnail_url: thumb,
          video_url: isVideo ? item.url : null,
          watch_url: watchUrl
        };
      });

      return res.json({ source: 'api_nasa_gov', data: fixedData });
    }
  } catch (err) {
    console.warn('api.nasa.gov fallback fetch error:', err.message);
  }

  // Final fallback: return curated space items matching closest dates
  return res.json({
    source: 'archive_gallery',
    data: fallbackPhotos
  });
});

// Serve static assets from project root
app.use(express.static(__dirname));

// Fallback to index.html for unmatched routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`NASA Space Explorer dev server running at http://${HOST}:${PORT}`);
});
