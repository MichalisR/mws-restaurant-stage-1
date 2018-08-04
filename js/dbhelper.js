/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}`;
  }

  // set the database
  static setDB() {
    return idb.open('restaurants', 1, db => {
      if (!db.objectStoreNames.contains('restaurants')) {
        db.createObjectStore('restaurants', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('reviews')) {
        const reviews = db.createObjectStore('reviews', { keyPath: 'id' });
        reviews.createIndex('byRestaurant', 'restaurant_id', {unique: false});
      }
    });
  }

  /**
   * Fetch all restaurants stored in DB
   */
  static getAllRestaurantsFromDB() {
    let dbPromise = DBHelper.setDB();
    return dbPromise.then(db => {
      if (!db) return;
      let transaction = db.transaction('restaurants');
      let store = transaction.objectStore('restaurants');
      return store.getAll();
    });
  }

  /** 
   * Fetch restaurant from DB by Id
   */
  static getCachedRestaurant(id) {
    let dbPromise = DBHelper.setDB();
    return dbPromise.then(db => {
      if (!db) return;
      let transaction =  db.transaction('restaurants')
      let store = transaction.objectStore('restaurants')
      return store.get(Number(id));
    });
  }

  /**
   * Update restaurant stored in DB
   */
  static updateRestaurantInDB(restaurant, data) {
    restaurant[data.key] = data.value;
    let dbPromise = DBHelper.setDB();
    return dbPromise.then(db => {
      if (!db) return;
      let transaction = db.transaction('restaurants', 'readwrite');
      let store = transaction.objectStore('restaurants');
      store.put(restaurant);
      return store.complete;
    })
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    fetch(`${DBHelper.DATABASE_URL}/restaurants`)
      .then(response => response.json())
      .then(restaurants => {
        let dbPromise = DBHelper.setDB();
        dbPromise.then(db => {
          if (!db) return callback(null, restaurants);
          let transaction = db.transaction('restaurants', 'readwrite');
          let store = transaction.objectStore('restaurants');
          restaurants.forEach(restaurant => store.put(restaurant));
        });
        callback(null, restaurants);
      }).catch(error => {
        console.log(error);
        DBHelper.getAllRestaurantsFromDB()
          .then(storedRestaurants => {
            if (storedRestaurants.length > 0) return callback(null, storedRestaurants);
          })
          .catch(error => callback(error, null));
      });
      
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    fetch(`${DBHelper.DATABASE_URL}/restaurants/${id}`)
    .then(response => response.json())
    .then(restaurant => {
      let dbPromise = DBHelper.setDB();
      dbPromise.then(db => {
        if (!db) return callback(null, restaurant);
        let transaction = db.transaction('restaurants', 'readwrite');
        let store = transaction.objectStore('restaurants');
        store.put(restaurant);
      });
      callback(null, restaurant);
    })
    .catch(error => {
      DBHelper.getRestaurantByIdFromDB(id)
        .then(storedRestaurants => {
          if (storedRestaurants) return callback(null, storedRestaurants)
        })
        .catch(error => callback(error, null))
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    if (`${restaurant.photograph}` === 'undefined') {
      return ('10-300.jpg');
    }
    return (`/img/${restaurant.photograph}`+'-300.jpg');
  }

  /**
   * Map marker for a restaurant.
   */
   static mapMarkerForRestaurant(restaurant, map) {
    // https://leafletjs.com/reference-1.3.0.html#marker  
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
      {title: restaurant.name,
      alt: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant)
      })
      marker.addTo(newMap);
    return marker;
  } 
  /* static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  } */

  /**
   * Index image Srcset.
   */
  static imageSrcsetForIndex(restaurant) {
    if (`${restaurant.photograph}` === 'undefined') {
      return ('img/10-300.jpg 1x, img/10-600_2x.jpg 2x');
    }
    return ('img/'+`${restaurant.photograph}`+'-300.jpg 1x, img/'+`${restaurant.srcset_index}`+'-600_2x.jpg 2x');
  }

  /**
   * Restaurant image Srcset.
   */
  static imageSrcsetForRestaurant(restaurant) {
    if (`${restaurant.photograph}` === 'undefined') {
      return ('img/10-300.jpg 300w, img/10-400.jpg 400w,img/10-600_2x.jpg 600w, img/10-800_2x.jpg 800w');
    }
    return ('img/'+`${restaurant.photograph}`+'-300.jpg 300w, img/'+`${restaurant.photograph}`+'-400.jpg 400w,img/'+`${restaurant.photograph}`+'-600_2x.jpg 600w, img/'+`${restaurant.photograph}`+'-800_2x.jpg 800w');
  }

  // set favorite restaurant
  static setRestaurantFavorite(id, state, callback) {
    fetch(`${DBHelper.DATABASE_URL}/restaurants/${Number(id)}/?is_favorite=${state}`, {method: 'put'})
      .then(response => callback(null, response))
      .catch(error => callback(error, null));
  }

  // store data about favorite restaurants in DB
  static setLocalRestaurantFavorite(id, state) {
    let dbPromise = DBHelper.setDB();
    const data = { id: id, is_favorite: state};
    return dbPromise.then(db => {
      if (!db) return;
      let transaction = db.transaction('local-restaurants', 'readwrite');
      let store = transaction.objectStore('local-restaurants');
      store.put(data);
      return store.complete;
    })
  }
  // get information about modified
  static getLocalRestaurantFavorite() {
    let dbPromise = DBHelper.setDB();
    return dbPromise.then(db => {
      if (!db) return;
      let transaction = db.transaction('local-restaurants', 'readwrite');
      let store = transaction.objectStore('local-restaurants');
      let data = store.getAll();
      store.clear();
      return data;
    })
  }

  // add new restaurant's review
  static addRestaurantReview(review, callback) {
    fetch(`${DBHelper.DATABASE_URL}/reviews/`, {
      method: 'post',
      body: JSON.stringify(review)
    })
      .then(response => response.json())
      .then(response => callback(null, response))
      .catch(error => callback(error, null))
  }

  // add new rewiev
   static addLocalDBReview(review) {
     let dbPromise = DBHelper.setDB();
     let date = Date.parse(new Date);
     return dbPromise.then(db => {
       if (!db) return;
       let transaction = db.transaction('local-reviews', 'readwrite');
       let store = transaction.objectStore('local-reviews');
       store.put({...review, createdAt: date, updatedAt: date});
       return store.complete;
     })
   }

   //  put added review to reviews indexeddb
  static updateDBReviews(review) {
    let dbPromise = DBHelper.setDB();
    return dbPromise.then(db => {
      if (!db) return;
      let transaction = db.transaction('reviews', 'readwrite');
      let store = transaction.objectStore('reviews');
      store.put(review);
      return store.complete;
    })
  }

  // get reviews stored only in local (cached) DB
   static getLocalDBReviews(clean = false) {
    let dbPromise = DBHelper.setDB();
    return dbPromise.then(db => {
      if (!db) return;
      let transaction = db.transaction('local-reviews', 'readwrite');
      let store = transaction.objectStore('local-reviews');
      let reviews = store.getAll();
      if (clean) store.clear();
      return reviews;
    })
   }

   // sync data stored locally with the server
  static syncReviews(reviews) {
    reviews.forEach(review => {
      DBHelper.addRestaurantReview(review, (error, response) => {
        if (error) return console.log(error);
        DBHelper.updateDBReviews(response)
          .then(res => console.log(res))
          .catch(error => console.log(error));
      })
    })
  }

  // sync information about favorites restaurants stored locally with the server
  static syncFavorites(data) {
    data.forEach(entry => {
      DBHelper.setRestaurantFavorite(entry.id, entry.is_favorite, (error, response) => {
        if (error) return console.log(error);
        console.log(response);
      });
    });
  }

}

