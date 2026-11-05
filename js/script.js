// Find our date picker inputs on the page
const startInput = document.getElementById('startDate');
const endInput = document.getElementById('endDate');
const gallery = document.getElementById('gallery');
const getImagesButton = document.querySelector('.filters button');

// NASA's public demo key works for trying the API, but has a low request limit.
const apiKey = 'DEMO_KEY';

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

function createApodCard(apod) {
	const card = document.createElement('article');
	card.className = 'gallery-item';

	if (apod.media_type === 'image') {
		const image = document.createElement('img');
		image.src = apod.url;
		image.alt = apod.title;
		card.appendChild(image);
	} else {
		const videoLink = document.createElement('a');
		videoLink.href = apod.url;
		videoLink.target = '_blank';
		videoLink.rel = 'noopener noreferrer';
		videoLink.textContent = 'Watch this APOD video';
		card.appendChild(videoLink);
	}

	const title = document.createElement('h2');
	title.textContent = apod.title;
	card.appendChild(title);

	const date = document.createElement('p');
	date.textContent = apod.date;
	card.appendChild(date);

	const explanation = document.createElement('p');
	explanation.textContent = apod.explanation;
	card.appendChild(explanation);

	return card;
}

async function getSpaceImages() {
	const startDate = startInput.value;
	const endDate = endInput.value;

	if (!startDate || !endDate || startDate > endDate) {
		showMessage('Choose a valid start and end date.');
		return;
	}

	getImagesButton.disabled = true;
	showMessage('Loading space images...');

	const parameters = new URLSearchParams({
		api_key: apiKey,
		start_date: startDate,
		end_date: endDate
	});

	try {
		const response = await fetch(`https://api.nasa.gov/planetary/apod?${parameters}`);
		const data = await response.json();

		if (!response.ok) {
			throw new Error(data.msg || data.error?.message || 'NASA could not return the images.');
		}

		const apods = Array.isArray(data) ? data : [data];
		gallery.textContent = '';

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
