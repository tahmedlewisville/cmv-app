define([
	'dojo/_base/declare',
	'esri/map',
	'esri/dijit/PopupMobile',
	'dojo/_base/lang',
	'dojo/_base/array',
	//'dojo/topic',
	'dojo/on',
	'dojo/has',
	'put-selector'
], function (
	declare,
	Map,
	PopupMobile,
	lang,
	array,
	//topic,
	on,
	has,
	put
) {
	return declare(null, {
		layers: [],
		layerTypes: {
			csv: 'CSV',
			dynamic: 'ArcGISDynamicMapService',
			feature: 'Feature',
			georss: 'GeoRSS',
			image: 'ArcGISImageService',
			kml: 'KML',
			label: 'Label', //untested
			mapimage: 'MapImage', //untested
			osm: 'OpenStreetMap',
			tiled: 'ArcGISTiledMapService',
			wms: 'WMS',
			wmts: 'WMTS' //untested
		},

		initMap: function () {
			if (has('phone') && !this.config.mapOptions.infoWindow) {
				this.config.mapOptions.infoWindow = new PopupMobile(null, put('div'));
			}
			this.map = new Map('mapCenter', this.config.mapOptions);
			if (this.config.mapOptions.basemap) {
				this.map.on('load', lang.hitch(this, 'initLayers'));
			} else {
				this.initLayers();
			}

			// In Widgets Mixin
			if (this.config.operationalLayers && this.config.operationalLayers.length > 0) {
				on.once(this.map, 'layers-add-result', lang.hitch(this, 'initWidgets'));
			} else {
				this.initWidgets();
			}
		},

		initLayers: function () {
			this.map.on('resize', function (evt) {
				var pnt = evt.target.extent.getCenter();
				setTimeout(function () {
					evt.target.centerAt(pnt);
				}, 100);
			});

			this.layers = [];

			// loading all the required modules first ensures the layer order is maintained
			var modules = [];
			array.forEach(this.config.operationalLayers, function (layer) {
				var type = this.layerTypes[layer.type];
				if (type) {
					modules.push('esri/layers/' + type + 'Layer');
				} else {
					this.handleError({
						source: 'Controller',
						error: 'Layer type "' + layer.type + '"" isnot supported: '
					});
				}
			}, this);

			require(modules, lang.hitch(this, function () {
				array.forEach(this.config.operationalLayers, function (layer) {
					var type = this.layerTypes[layer.type];
					if (type) {
						require(['esri/layers/' + type + 'Layer'], lang.hitch(this, 'initLayer', layer));
					}
				}, this);
				this.map.addLayers(this.layers);
			}));
		},

		initLayer: function (layer, Layer) {
			var l = new Layer(layer.url, layer.options);
			this.layers.unshift(l); //unshift instead of push to keep layer ordering on map intact

			//Legend LayerInfos array
			this.legendLayerInfos.unshift({ //unshift instead of push to keep layer ordering in legend intact
				layer: l,
				title: layer.title || null
			});

			//TOC LayerInfos array
			this.tocLayerInfos.push({ //push because TOC needs the layers in the opposite order
				layer: l,
				title: layer.title || null,
				slider: (layer.slider === false) ? false : true,
				noLegend: layer.noLegend || false,
				collapsed: layer.collapsed || false,
				sublayerToggle: layer.sublayerToggle || false
			});

			//LayerControl LayerInfos array
			this.layerControlLayerInfos.unshift({ //unshift instead of push to keep layer ordering in LayerControl intact
				layer: l,
				type: layer.type,
				title: layer.title,
				controlOptions: layer.layerControlLayerInfos
			});

			if (layer.type === 'feature') {
				var options = {
					featureLayer: l
				};
				if (layer.editorLayerInfos) {
					lang.mixin(options, layer.editorLayerInfos);
				}
				this.editorLayerInfos.push(options);
			}

			if (layer.type === 'dynamic' || layer.type === 'feature') {
				var idOptions = {
					layer: l,
					title: layer.title
				};
				if (layer.identifyLayerInfos) {
					lang.mixin(idOptions, layer.identifyLayerInfos);
				}
				if (idOptions.exclude !== true) {
					this.identifyLayerInfos.push(idOptions);
				}
			}
		}
	});
});