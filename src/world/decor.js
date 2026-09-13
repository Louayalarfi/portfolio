// Room props with no projects. key is the manifest model key, footprint the size on the scaleBy axis.
// Positions are world space, the desk top is y = 0.18 and the floor is y = 0.

export const DECOR = [
  { key: 'keyboard',  pos: [ 3.05, 0.18,  1.05], rotY: -0.5,  footprint: 3.4,  scaleBy: 'width' },
  { key: 'mouse',     pos: [ 4.55, 0.18,  1.35], rotY: -0.4,  footprint: 0.9,  scaleBy: 'depth' },
  { key: 'lamp',      pos: [ 5.55, 0.18, -2.05], rotY:  2.4,  footprint: 3.0,  scaleBy: 'height' },
  { key: 'plant',     pos: [-6.75, 0.00,  1.20], rotY:  0.3,  footprint: 3.2,  scaleBy: 'height' },
  { key: 'bookshelf', pos: [-3.20, 0.00, -4.15], rotY:  0.0,  footprint: 6.0,  scaleBy: 'width' },
  { key: 'chair',     pos: [-1.60, 0.00,  4.70], rotY:  2.75, footprint: 4.6, scaleBy: 'width' }
];
