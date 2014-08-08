	// After page is fully loaded


	// configuration
	var myZoom = 13;
	var myMarkerIsDraggable = true;
	var myCoordsLenght = 6;
	var defaultLat = 61.475444;
	var defaultLng = 23.882672;

	// creates the map
	// zooms
	// centers the map
	// sets the map’s type
	var map = new google.maps.Map(document.getElementById('map_canvas'), {
		zoom: myZoom,
		center: new google.maps.LatLng(defaultLat, defaultLng),
		mapTypeId: google.maps.MapTypeId.ROADMAP
	});

	// creates a draggable marker to the given coords
	var myMarker = new google.maps.Marker({
		position: new google.maps.LatLng(defaultLat, defaultLng),
		draggable: myMarkerIsDraggable
	});

	// adds a listener to the marker
	// gets the coords when drag event ends
	// then updates the input with the new coords
	google.maps.event.addListener(myMarker, 'dragend', function(evt){
		document.getElementById('input_lat').value = evt.latLng.lat().toFixed(myCoordsLenght);
		document.getElementById('input_lng').value = evt.latLng.lng().toFixed(myCoordsLenght);
	});

	// centers the map on markers coords
	map.setCenter(myMarker.position);

	// adds the marker on the map
	myMarker.setMap(map);

var setMarker = function() {
	if(document.getElementById('input_lat').value.length > 0 && 
		 parseFloat(document.getElementById('input_lat').value) != NaN) {
		defaultLat = document.getElementById('input_lat').value;
	}
	if(document.getElementById('input_lng').value.length > 0 && 
		 parseFloat(document.getElementById('input_lng').value) != NaN) {
		defaultLng = document.getElementById('input_lng').value;
	}
	myMarker.position = new google.maps.LatLng(defaultLat, defaultLng);
	map.setCenter(myMarker.position);
}

setTimeout(1000,'setMarker();');