// Find our date picker inputs on the page
const startInput = document.getElementById('startDate');
const endInput = document.getElementById('endDate');
const gallery = document.getElementById('gallery');
const getImagesButton = document.querySelector('.filters button');

// Call the setupDateInputs function from dateRange.js
// This sets up the date pickers to:
// - Default to a range of 9 days (from 9 days ago to today)
// - Restrict dates to NASA's image archive (starting from 1995)
setupDateInputs(startInput, endInput);

function showMessage(message) {
	gallery.textContent = '';

	const paragraph = document.createElement('p');
	paragraph.className = 'placeholder';
	paragraph.textContent = message;
	gallery.appendChild(paragraph);
}

// Opens modal with full-size image (or video), title, date, and explanation
function openApodModal(apod) {
	// Remove any existing modal
	const existing = document.querySelector('.apod-modal-backdrop');
	if (existing) existing.remove();

	const backdrop = document.createElement('div');
	backdrop.className = 'apod-modal-backdrop';

	const modal = document.createElement('div');
	modal.className = 'apod-modal-card';

	const closeBtn = document.createElement('button');
	closeBtn.className = 'apod-modal-close';
	closeBtn.innerHTML = '&times;';
	closeBtn.setAttribute('aria-label', 'Close modal');
	closeBtn.addEventListener('click', () => backdrop.remove());
	modal.appendChild(closeBtn);

	const mediaContainer = document.createElement('div');
	mediaContainer.className = 'apod-modal-media';

	const isVideo = apod.media_type === 'video' || !!apod.video_url;

	if (isVideo) {
		const videoSrc = apod.video_url || apod.url;
		if (videoSrc.endsWith('.mp4') || videoSrc.includes('.mp4?')) {
			const video = document.createElement('video');
			video.controls = true;
			video.autoplay = true;
			video.src = videoSrc;
			if (apod.thumbnail_url) video.poster = apod.thumbnail_url;
			mediaContainer.appendChild(video);
		} else {
			const iframe = document.createElement('iframe');
			let embedSrc = videoSrc;
			if (embedSrc.includes('youtube.com') || embedSrc.includes('youtu.be')) {
				embedSrc += (embedSrc.includes('?') ? '&' : '?') + 'autoplay=1';
			}
			iframe.src = embedSrc;
			iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
			iframe.allowFullscreen = true;
			mediaContainer.appendChild(iframe);
		}
	} else {
		// Full-size image (prefer HD resolution if available)
		const fullImage = document.createElement('img');
		fullImage.src = apod.hdurl || apod.url;
		fullImage.alt = apod.title;
		mediaContainer.appendChild(fullImage);
	}
	modal.appendChild(mediaContainer);

	const body = document.createElement('div');
	body.className = 'apod-modal-body';

	const title = document.createElement('h2');
	title.className = 'apod-modal-title';
	title.textContent = apod.title;
	body.appendChild(title);

	const date = document.createElement('p');
	date.className = 'apod-modal-date';
	date.textContent = `📅 ${apod.date}`;
	body.appendChild(date);

	const explanation = document.createElement('div');
	explanation.className = 'apod-modal-explanation';
	explanation.textContent = apod.explanation;
	body.appendChild(explanation);

	const footer = document.createElement('div');
	footer.className = 'apod-modal-footer';

	if (isVideo && apod.watch_url) {
		const watchLink = document.createElement('a');
		watchLink.className = 'apod-modal-hd-btn';
		watchLink.href = apod.watch_url;
		watchLink.target = '_blank';
		watchLink.rel = 'noopener noreferrer';
		watchLink.textContent = '▶ Watch on Original Platform ↗';
		footer.appendChild(watchLink);
	} else if (apod.hdurl || apod.url) {
		const hdLink = document.createElement('a');
		hdLink.className = 'apod-modal-hd-btn';
		hdLink.href = apod.hdurl || apod.url;
		hdLink.target = '_blank';
		hdLink.rel = 'noopener noreferrer';
		hdLink.textContent = '🔍 View Full-Resolution Image ↗';
		footer.appendChild(hdLink);
	}

	body.appendChild(footer);
	modal.appendChild(body);
	backdrop.appendChild(modal);

	backdrop.addEventListener('click', (e) => {
		if (e.target === backdrop) backdrop.remove();
	});

	const onKey = (e) => {
		if (e.key === 'Escape') {
			backdrop.remove();
			document.removeEventListener('keydown', onKey);
		}
	};
	document.addEventListener('keydown', onKey);

	document.body.appendChild(backdrop);
}

function createApodCard(apod) {
	const card = document.createElement('article');
	card.className = 'gallery-item';

	const isVideo = apod.media_type === 'video' || !!apod.video_url;

	if (isVideo) {
		const mediaWrapper = document.createElement('div');
		mediaWrapper.className = 'media-wrapper';

		const thumbnailImg = document.createElement('img');
		thumbnailImg.src = apod.thumbnail_url || apod.hdurl || apod.url;
		thumbnailImg.alt = apod.title;
		thumbnailImg.title = 'Click to open full-size view, video & explanation';
		thumbnailImg.addEventListener('click', () => openApodModal(apod));
		mediaWrapper.appendChild(thumbnailImg);

		const tag = document.createElement('span');
		tag.className = 'video-tag';
		tag.textContent = '▶ Video';
		mediaWrapper.appendChild(tag);

		const playBtn = document.createElement('button');
		playBtn.type = 'button';
		playBtn.className = 'play-overlay';
		playBtn.title = 'Watch video';
		playBtn.setAttribute('aria-label', `Play ${apod.title}`);
		playBtn.innerHTML = '▶';
		playBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			openApodModal(apod);
		});

		mediaWrapper.appendChild(playBtn);
		card.appendChild(mediaWrapper);
	} else {
		const imgWrapper = document.createElement('div');
		imgWrapper.className = 'image-wrapper';

		const image = document.createElement('img');
		image.src = apod.url;
		image.alt = apod.title;
		image.title = 'Click to open full-size image, title, date and explanation';
		image.addEventListener('click', () => openApodModal(apod));
		imgWrapper.appendChild(image);
		card.appendChild(imgWrapper);
	}

	const title = document.createElement('h2');
	title.textContent = apod.title;
	title.style.cursor = 'pointer';
	title.title = 'Click to open full details';
	title.addEventListener('click', () => openApodModal(apod));
	card.appendChild(title);

	const date = document.createElement('p');
	date.className = 'date';
	date.textContent = apod.date;
	card.appendChild(date);

	if (isVideo) {
		const actions = document.createElement('div');
		actions.className = 'video-actions';

		if (apod.watch_url) {
			const watchLink = document.createElement('a');
			watchLink.className = 'video-link';
			watchLink.href = apod.watch_url;
			watchLink.target = '_blank';
			watchLink.rel = 'noopener noreferrer';
			watchLink.textContent = '▶ Watch Video ↗';
			actions.appendChild(watchLink);
		}

		const modalBtn = document.createElement('button');
		modalBtn.type = 'button';
		modalBtn.className = 'modal-play-btn';
		modalBtn.textContent = '⛶ Open Modal';
		modalBtn.addEventListener('click', () => openApodModal(apod));
		actions.appendChild(modalBtn);

		card.appendChild(actions);
	}

	const hint = document.createElement('span');
	hint.className = 'click-hint';
	hint.textContent = '🔍 Click image for full view & explanation';
	hint.addEventListener('click', () => openApodModal(apod));
	card.appendChild(hint);

	return card;
}

const spaceFacts = [
	"One day on Venus is longer than one full year on Venus — it takes 243 Earth days to rotate once, but only 225 Earth days to orbit the Sun!",
	"The footprints left on the Moon by Apollo astronauts will stay there for at least 100 million years because there is no atmosphere, wind, or water erosion.",
	"NASA's Voyager 1 spacecraft is the farthest human-made object from Earth, traveling in interstellar space over 15 billion miles (24 billion km) away.",
	"Neutron stars are so dense that a single sugar-cube-sized piece of their material would weigh approximately 1 billion tons on Earth!",
	"Sunsets on Mars appear distinctly blue because the fine atmospheric dust scatters red light while letting blue wavelengths pass through.",
	"Saturn's moon Enceladus continuously sprays geysers of water ice into space from a global liquid ocean hidden beneath its frozen crust.",
	"NASA's James Webb Space Telescope is so sensitive it could detect the thermal heat signature of a bumblebee at the distance of the Moon!",
	"There are estimated to be more trees on Earth (around 3 trillion) than stars in the entire Milky Way galaxy (100 to 400 billion).",
	"Space is not completely silent — acoustic pressure waves travel through hot gas in galaxy clusters, which NASA sonified into an eerie cosmic hum.",
	"Jupiter’s Great Red Spot is a giant anticyclonic storm that has raged for centuries and is large enough to swallow Earth completely.",
	"The International Space Station travels at 17,500 mph (28,000 km/h), orbiting Earth every 90 minutes so astronauts experience 16 sunrises every 24 hours.",
	"If two pieces of clean, unoxidized metal touch in the vacuum of space, they permanently fuse together in a phenomenon known as cold welding."
];

function showLoadingWithFact() {
	gallery.textContent = '';

	const loadingBox = document.createElement('div');
	loadingBox.className = 'loading-box';

	const spinner = document.createElement('div');
	spinner.className = 'loading-spinner';
	loadingBox.appendChild(spinner);

	const title = document.createElement('h3');
	title.className = 'loading-title';
	title.textContent = 'Retrieving Space Images from NASA...';
	loadingBox.appendChild(title);

	const factCard = document.createElement('div');
	factCard.className = 'fact-card';

	const badge = document.createElement('span');
	badge.className = 'fact-badge';
	badge.textContent = '🚀 Did You Know?';
	factCard.appendChild(badge);

	const randomFact = spaceFacts[Math.floor(Math.random() * spaceFacts.length)];
	const factText = document.createElement('p');
	factText.className = 'fact-text';
	factText.textContent = randomFact;
	factCard.appendChild(factText);

	loadingBox.appendChild(factCard);
	gallery.appendChild(loadingBox);
}

async function getSpaceImages() {
	const startDate = startInput.value;
	const endDate = endInput.value;

	if (!startDate || !endDate || startDate > endDate) {
		showMessage('Choose a valid start and end date.');
		return;
	}

	getImagesButton.disabled = true;
	showLoadingWithFact();

	const parameters = new URLSearchParams({
		start_date: startDate,
		end_date: endDate
	});

	try {
		// Use server-side proxy which handles API keys, caching, and rate limit prevention
		const response = await fetch(`/api/apod?${parameters}`);
		const result = await response.json();

		if (!response.ok && !result.data) {
			throw new Error(result.error || 'NASA could not return the images.');
		}

		const apods = result.data || (Array.isArray(result) ? result : [result]);
		gallery.textContent = '';

		if (result.message) {
			const notice = document.createElement('div');
			notice.className = 'notice';
			notice.textContent = result.message;
			gallery.appendChild(notice);
		}

		if (!apods || apods.length === 0) {
			showMessage('No space images found for this date range.');
			return;
		}

		apods.forEach((apod) => {
			gallery.appendChild(createApodCard(apod));
		});
	} catch (error) {
		showMessage(`Could not load space images: ${error.message}`);
	} finally {
		getImagesButton.disabled = false;
	}
}

getImagesButton.addEventListener('click', getSpaceImages);
