// Ange din Mapbox access token
mapboxgl.accessToken =
  "pk.eyJ1IjoiYW5nZWxvY29sbCIsImEiOiJjbHljc29zazQwbTV3MmlzZ2kya2Fmd2ZmIn0.EyBJ4ZFDdfF1ueoNw0tgpw";

// Använder geolocation API för att kontinuerligt spåra användarens position
navigator.geolocation.watchPosition(successLocation, errorLocation, {
  enableHighAccuracy: true, // Använd hög precision
  maximumAge: 1000, // Maximal ålder i millisekunder för en möjlig cachad position
  timeout: 5000, // Maximal tid i millisekunder att vänta på en position
});

let map, directions, userMarker; // Deklarerar variabler för kartan, directions-plugin och användarens markör
const destinationMarkers = []; // Array för att hålla destinationsmarkörer

// Funktion som körs vid lyckad positionering
function successLocation(position) {
  const coords = [position.coords.longitude, position.coords.latitude]; // Hämtar longitud och latitud från positionen
  if (!map) {
    setupMap(coords, true); // Om kartan inte finns, sätt upp kartan med användarens koordinater
  } else {
    updatePosition(coords); // Uppdatera användarens position på kartan
  }
}

// Funktion som körs vid misslyckad positionering
function errorLocation() {
  setupMap([-59.334591, 18.06324], false); // Sätt upp kartan med en default position
}

// Funktion för att sätta upp kartan
function setupMap(center, useCurrentLocation) {
  // Initiera en ny Mapbox-karta
  map = new mapboxgl.Map({
    container: "map", // HTML-elementet som kartan ska ritas i
    style: "mapbox://styles/mapbox/streets-v11", // Kartutseende
    center: center, // Kartans center
    zoom: 15, // Zoomnivå
  });

  const nav = new mapboxgl.NavigationControl(); // Skapa navigationskontroll
  map.addControl(nav); // Lägg till navigationskontroll på kartan

  // Initiera Mapbox Directions plugin
  directions = new MapboxDirections({
    accessToken: mapboxgl.accessToken, // Mapbox access token
    profile: "mapbox/driving", // Transportmedel: bil
    alternatives: true, // Tillåt alternativa rutter
    congestion: true, // Inkludera trafikstockningsinformation
  });

  map.addControl(directions, "top-left"); // Lägg till directions-plugin på kartan

  if (useCurrentLocation) {
    directions.setOrigin(center); // Sätt startpunkt för ruttberäkning till användarens position

    // Skapa och placera en blå markör på användarens position
    userMarker = new mapboxgl.Marker({
      color: "blue",
      draggable: false,
    })
      .setLngLat(center)
      .addTo(map);
  } else {
    directions.setOrigin([18.0686, 59.3293]); // Sätt startpunkt till Stockholm om användarens position inte används
  }
}

// Funktion för att uppdatera användarens position på kartan
function updatePosition(coords) {
  if (userMarker) {
    userMarker.setLngLat(coords); // Uppdatera markörens position
  } else {
    // Skapa och placera en blå markör om den inte redan finns
    userMarker = new mapboxgl.Marker({
      color: "blue",
      draggable: false,
    })
      .setLngLat(coords)
      .addTo(map);
  }

  directions.setOrigin(coords); // Uppdatera startpunkten för ruttberäkning
}

// Hanterar röstigenkänning när användaren klickar på en knapp
document.getElementById("voiceButton").addEventListener("click", () => {
  if ("webkitSpeechRecognition" in window) {
    const recognition = new webkitSpeechRecognition();
    recognition.lang = "sv-SE"; // Sätt språket för röstigenkänning till svenska
    recognition.continuous = false; // Kör inte kontinuerligt
    recognition.interimResults = false; // Visa inte interimresultat

    recognition.onstart = () => {
      console.log("Voice recognition påbörjad.");
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript; // Hämta det transkriberade talet
      console.log("Voice Data = ", transcript);
      setDestination(transcript); // Sätt destinationen baserat på talinmatningen
    };

    recognition.onerror = (event) => {
      console.error("Voice recognition error", event);
    };

    recognition.onend = () => {
      console.log("Voice recognition avslutad.");
    };

    recognition.start(); // Starta röstigenkänning
  } else {
    alert("Voice recognition not supported in this browser."); // Visa ett meddelande om webbläsaren inte stödjer röstigenkänning
  }
});

// Funktion för att sätta en destination baserat på användarens inmatning
function setDestination(location) {
  resetMap(); // Rensa befintliga riktningar och markörer

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
    location
  )}.json?country=SE&proximity=18.0686,59.3293&access_token=${
    mapboxgl.accessToken
  }`;

  // Hämta koordinater för den angivna platsen från Mapbox Geocoding API
  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      if (data.features && data.features.length > 0) {
        const destination = data.features[0].center; // Hämta koordinater för den första träffen
        directions.setDestination(destination); // Sätt destinationen i directions-plugin
        addMarker(destination); // Lägg till en markör på destinationen
      } else {
        console.log("Adress hittades inte.");
      }
    })
    .catch((error) => {
      console.error("Error", error);
    });
}

// Hanterar val av fördefinierade rutter från en dropdown-meny
document.getElementById("routeSelect").addEventListener("change", (event) => {
  const selectedRoute = event.target.value; // Hämta det valda alternativet
  switch (selectedRoute) {
    case "Bil1":
      resetMap();
      setMultipleDestinations([
        "bälstavägen 36, Stockholm",
        "Bromma Blocks, Stockholm",
        "karlsbodavägen 56, Stockholm",
        "Willys Esplanaden, Stockholm",
      ]);
      break;
    case "Bil2":
      resetMap();
      setMultipleDestinations([
        "sturegatan 21, Stockholm",
        "sturegatan 31, Stockholm",
        "sturegatan 41, Stockholm",
        "sturegatan 44, Stockholm",
      ]);
      break;
    default:
      resetMap(); // Rensa kartan om inget fördefinierat alternativ är valt
  }
});

// Funktion för att sätta flera destinationer sekventiellt
function setMultipleDestinations(destinations) {
  const addNextDestination = (index) => {
    if (index < destinations.length) {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        destinations[index]
      )}.json?country=SE&proximity=18.0686,59.3293&access_token=${
        mapboxgl.accessToken
      }`;

      // Hämta koordinater för varje destination från Mapbox Geocoding API
      fetch(url)
        .then((response) => response.json())
        .then((data) => {
          if (data.features && data.features.length > 0) {
            const destination = data.features[0].center; // Hämta koordinater för den första träffen
            if (index === 0) {
              directions.setDestination(destination); // Sätt den första destinationen
            } else {
              directions.addWaypoint(index - 1, destination); // Lägg till som waypoint om det inte är första destinationen
            }
            addMarker(destination); // Lägg till en markör på destinationen
            addNextDestination(index + 1); // Fortsätt till nästa destination
          } else {
            console.log("Adress hittades inte.");
          }
        })
        .catch((error) => {
          console.error("Error", error);
        });
    }
  };

  addNextDestination(0); // Starta processen med den första destinationen
}

// Funktion för att lägga till en markör på kartan
function addMarker(coords) {
  const marker = new mapboxgl.Marker({
    color: "green",
    draggable: false,
  })
    .setLngLat(coords)
    .addTo(map); // Lägg till markören på kartan
  destinationMarkers.push(marker); // Lägg till markören i arrayen
}

// Funktion för att rensa alla markörer från kartan
function clearMarkers() {
  destinationMarkers.forEach((marker) => marker.remove()); // Ta bort varje markör
  destinationMarkers.length = 0; // Töm arrayen
}

// Funktion för att återställa kartan
function resetMap() {
  directions.setDestination(""); // Rensa destinationen i directions-plugin
  clearMarkers(); // Rensa alla markörer
}

// Lägg till en händelsehanterare för att ladda om sidan när en ruta väljs
document.addEventListener("click", (event) => {
  const routeSelect = document.getElementById("routeSelect");
  if (routeSelect.value !== "Välj") {
    location.reload(); // Ladda om sidan om en rutt är vald
  }
});
