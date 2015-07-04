angular.module("leaflet-directive").directive('bounds', function ($log, $timeout, $http, leafletMapDefaults, leafletHelpers, leafletBoundsHelpers) {
    return {
        restrict: "A",
        scope: false,
        replace: false,
        require: [ 'leaflet' ],

        link: function(scope, element, attrs, controller) {
            var isDefined = leafletHelpers.isDefined;
            var createLeafletBounds = leafletBoundsHelpers.createLeafletBounds;
            var leafletScope = controller[0].getLeafletScope();
            var mapController = controller[0];
            var errorHeader = leafletHelpers.errorHeader + ' [Controls] ';

            var emptyBounds = function(bounds) {
                return (bounds._southWest.lat === 0 && bounds._southWest.lng === 0 &&
                        bounds._northEast.lat === 0 && bounds._northEast.lng === 0);
            };

            mapController.getMap().then(function (map) {
                var defaults = leafletMapDefaults.getDefaults(attrs.id);

                leafletScope.$on('boundsChanged', function (event) {
                    var scope = event.currentScope;
                    var bounds = map.getBounds();

                    if (emptyBounds(bounds) || scope.settingBoundsFromScope) {
                        return;
                    }
                    var newScopeBounds = {
                        northEast: {
                            lat: bounds._northEast.lat,
                            lng: bounds._northEast.lng
                        },
                        southWest: {
                            lat: bounds._southWest.lat,
                            lng: bounds._southWest.lng
                        },
                        options: bounds.options
                    };
                    if (!angular.equals(scope.bounds, newScopeBounds)) {
                        scope.bounds = newScopeBounds;
                    }
                });

                leafletScope.$watch('bounds', function (bounds) {
                    if (isDefined(bounds.address)) {
                        scope.settingBoundsFromScope = true;
                        var url = defaults.nominatim.server;
                        $http.get(url, { params: { format: 'json', limit: 1, q: bounds.address } }).success(function(data) {
                            if (data.length > 0 && isDefined(data[0].boundingbox)) {
                                var b = data[0].boundingbox;
                                var newBounds = [ [ b[0], b[2]], [ b[1], b[3]] ];
                                map.fitBounds(newBounds);
                            } else {
                                $log.error(errorHeader + ' Invalid Nominatim address.');
                            }

                            $timeout( function() {
                                scope.settingBoundsFromScope = false;
                            });
                        });
                        return;
                    }

                    var leafletBounds = createLeafletBounds(bounds);
                    if (leafletBounds && !map.getBounds().equals(leafletBounds)) {
                        scope.settingBoundsFromScope = true;
                        map.fitBounds(leafletBounds, bounds.options);
                        $timeout( function() {
                            scope.settingBoundsFromScope = false;
                        });
                    }
                }, true);
            });
        }
    };
});
