import * as THREE from 'three';

export const createTextSprite = (
  label: string,
  isRoot: boolean,
  isSelected: boolean,
  textColor: string,
  haloColor: string
) => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return new THREE.Sprite();

  const scaleMultiplier = 6;
  const baseFontSize = isRoot ? 24 : isSelected ? 20 : 13;
  const canvasFontSize = baseFontSize * scaleMultiplier;

  context.font = `bold ${canvasFontSize}px sans-serif`;
  
  const formattedLabel = label.length > 15 ? `${label.slice(0, 14)}...` : label;
  const textWidth = context.measureText(formattedLabel).width;

  canvas.width = textWidth + (20 * scaleMultiplier);
  canvas.height = canvasFontSize + (20 * scaleMultiplier);

  context.font = `bold ${canvasFontSize}px sans-serif`;

  context.strokeStyle = haloColor;
  context.lineWidth = 3.5 * scaleMultiplier;
  context.lineJoin = 'round';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.strokeText(formattedLabel, canvas.width / 2, canvas.height / 2);

  context.fillStyle = textColor;
  context.fillText(formattedLabel, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  
  const spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    depthTest: false,
    transparent: true,
  });
  const sprite = new THREE.Sprite(spriteMaterial);
  
  const spriteScaleFactor = 0.15 / scaleMultiplier;
  sprite.scale.set(canvas.width * spriteScaleFactor, canvas.height * spriteScaleFactor, 1);

  return sprite;
};
