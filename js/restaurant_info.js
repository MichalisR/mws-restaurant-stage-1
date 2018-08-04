let restaurant;
var newMap;

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {  
  initMap();
  initRating();
  watchOffline();
});

/**
 * Initialize leaflet map
 */
initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {      
      self.newMap = L.map('map', {
        center: [restaurant.latlng.lat, restaurant.latlng.lng],
        zoom: 16,
        scrollWheelZoom: false
      });
      L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
        mapboxToken: 'pk.eyJ1IjoibWljaGFsaXNyb2Rpb3MiLCJhIjoiY2pqNGhqZzhzMDVocDQxazV3MmprYmRzciJ9.7kvLVUmLtGafYJC8bxfISQ',
        maxZoom: 18,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
          '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
          'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox.streets'    
      }).addTo(newMap);
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.newMap);
    }
  });
}  
 
/* window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
} */

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img'
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.alt = `Photo of ${restaurant.name} Restaurant`;
  image.srcset = DBHelper.imageSrcsetForRestaurant(restaurant);
  image.sizes = "(max-width: 320px) 300px, (max-width: 425px) 400px, (max-width: 635px) 600px, (min-width: 636px) 400px";

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h3');
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.innerHTML = review.name;
  li.appendChild(name);

  const date = document.createElement('p');
  date.innerHTML = review.date;
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  li.setAttribute('aria-current', 'page');
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

// set or unset restaurant as favorite
setFavorite = (e, restaurant = self.restaurant) => {
  const button = document.getElementById('restaurant-favorite');
  const data = {key: 'is_favorite', value: 'false'};
  if (restaurant.is_favorite === 'true') {
    data.value = 'false';
    button.innerHTML = 'Add to favorites';
    button.setAttribute('aria-label', 'Add to favorites');
    button.classList.remove('isfavorite');
    informUser('Restaurant removed from favorites', 'success');
  } else {
    data.value = 'true';
    button.innerHTML = 'Remove from favorites';
    button.setAttribute('aria-label', 'Remove from favorites');
    button.classList.add('isfavorite');
    informUser('Restaurant added to favorites', 'success');
  }
  DBHelper.updateRestaurantInDB(restaurant, data);
  DBHelper.setRestaurantFavorite(restaurant.id, data.value, (error, response) => {
    if (error) {
      DBHelper.setLocalRestaurantFavorite(restaurant.id, data.value)
        .then(res => console.log(res))
        .catch(error => console.log(error));
    } else {
      console.log(response);
    }

  })
}

informUser = (message, type) => {
  const messageBox = document.getElementById('app-status');
  messageBox.innerHTML = message;
  messageBox.classList.add(type);
  messageBox.style.display = 'block';
  setTimeout(() => {
    messageBox.style.display = 'none';
  }, 3000);
}

initRating = () => {
  const form = document.querySelector('form');
  form.addEventListener('submit', e => addReview(e));
  const container = document.querySelector('#user-rating div');
  container.addEventListener('mouseout', () => clearRating());
  container.addEventListener('focusout', () => clearRating());
  const items = document.querySelectorAll('label.star');
  items.forEach(item => {
    item.addEventListener('mouseover', () => fillRating(item.firstChild));
    item.addEventListener('focusin', () => fillRating(item.firstChild));
    item.addEventListener('click', () => setRating(item.firstChild));
    item.addEventListener('keypress', e => {
      e.preventDefault();
      if (e.key == 'Enter' || e.key == ' ') setRating(`${item.firstChild}`);
    });
    item.setAttribute('tabindex', '0');
    item.setAttribute('aria-label', `set rating ${item.firstChild} of 5`);
  })
}

// fill rating star (style) by the given value
fillRating = (val) => {
  const items = document.querySelectorAll('label.star');
  items.forEach(item => {
    if (Number(item.firstChild.value) < Number(val)+1) {
      item.classList.add('orange')
    } else {
      item.classList.remove('orange');
    }
  })
}

// remove rating (it's for mouseover events)
clearRating = () => {
  const items = document.querySelectorAll('label.star');
  items.forEach(item => item.classList.remove('orange'));
}

// set rating input value (rating) by the given value
setRating = (val) => {
  const items = document.querySelectorAll('label.star');
  items.forEach(item => {
    if (Number(item.firstChild.value) < Number(val)+1) {
      item.classList.add('checked');
    } else {
      item.classList.remove('checked');
    }
  });
  items.forEach(item => item.removeAttribute('checked'));
  items[Number(val.data)-1].setAttribute('checked', 'checked');
}


// add new review (put data to database and render it on the screen)
addReview = (e, restaurant = self.restaurant) => {
  e.preventDefault();

  // set new review object
  const review = {
    name : secureInput(document.querySelector('input[name=user-name]').value),
    rating : Number(document.querySelector('label[class=star][checked=checked]')),
    comments : secureInput(document.querySelector('textarea[name=user-review]').value),
    restaurant_id : restaurant.id
  }
  
  // add new review to the server or indexedDB if error
  DBHelper.addRestaurantReview(review, (error, response) => {
    if (error) {
      // if review is not put on the server, add it to local (cached) DB
      DBHelper.addLocalDBReview(review).then(() => {
        informUser('Internet connection not detected. New review stored locally.', 'alert');
      });
    } else {
      // update cached reviews for offline usage
      DBHelper.updateDBReviews(response)
        .then(() => informUser('New review added', 'success'))
        .catch(err => console.log(err));
    }
  });

  // render review for the client
  clearReviewForm();
  const date = Date.parse(new Date);
  const ul = document.getElementById('reviews-list');
  ul.appendChild(createReviewHTML({...review, createdAt: date, updatedAt: date}));
}

// replace html to text in inputed values to secure the form
secureInput = (value) => {
  return value.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// clear the form 
clearReviewForm = () => {
  document.querySelector('input[name=user-name]').value = '';
  let labels = document.querySelectorAll('label.star')
  labels.forEach(label => {
    label.classList.remove('checked')
    label.removeAttribute('checked');
  });
  document.querySelector('textarea[name=user-review').value = '';
};

// monitor if the user is online
watchOffline = () => {
    window.addEventListener('online', e => {
      // notify the user
      informUser('You are online again. Syncing data...', 'info')
      
      // sync reviews
      DBHelper.getLocalDBReviews(true)
      .then(localReviews => DBHelper.syncReviews(localReviews))
      .catch(error => console.log(error));
    
      // sync restarants
      DBHelper.getLocalRestaurantFavorite()
      .then(data => DBHelper.syncFavorites(data))
      .catch(error => console.log(error));

    });
    window.addEventListener('offline', e => {
      informUser('No Internet connection detected', 'alert');
    });
  }
