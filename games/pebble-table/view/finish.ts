import { Effect, EffectAttribute } from 'postprocessing'
import * as THREE from 'three'

// The only full-screen pass: a gentle tilt-shift depth of field (the near
// and far table edges soften, the play band stays sharp), a warm grade, and
// a soft vignette, all in one shader so it stays cheap on an iPad.

const shader = /* glsl */ `
uniform float focusCenter;
uniform float focusBand;
uniform float blurRadius;
uniform float warmth;
uniform float vignette;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float away = max(0.0, abs(uv.y - focusCenter) - focusBand);
  float amount = smoothstep(0.0, 0.35, away) * blurRadius;
  vec3 color = inputColor.rgb;
  if (amount > 0.05) {
    vec3 sum = color;
    float weight = 1.0;
    for (int i = 0; i < 8; i++) {
      float a = float(i) * 0.785398 + 0.39;
      vec2 offset = vec2(cos(a), sin(a)) * texelSize * amount;
      sum += texture2D(inputBuffer, uv + offset).rgb;
      sum += texture2D(inputBuffer, uv + offset * 0.5).rgb;
      weight += 2.0;
    }
    color = sum / weight;
  }
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = clamp(color, 0.0, 1.0);
  color = max(mix(vec3(luma), color, 1.16), 0.0);
  vec3 curved = color * color * (3.0 - 2.0 * color);
  color = mix(color, curved, 0.32);
  color += vec3(0.035, 0.012, -0.03) * warmth;
  vec2 centered = uv - 0.5;
  color *= 1.0 - vignette * smoothstep(0.35, 0.85, length(centered * vec2(1.0, 1.15)));
  outputColor = vec4(color, inputColor.a);
}
`

export class ClayFinishEffect extends Effect {
  constructor({ focusCenter = 0.5, focusBand = 0.22, blurRadius = 3.2, warmth = 0.5, vignette = 0.28 } = {}) {
    super('ClayFinishEffect', shader, {
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, THREE.Uniform>([
        ['focusCenter', new THREE.Uniform(focusCenter)],
        ['focusBand', new THREE.Uniform(focusBand)],
        ['blurRadius', new THREE.Uniform(blurRadius)],
        ['warmth', new THREE.Uniform(warmth)],
        ['vignette', new THREE.Uniform(vignette)],
      ]),
    })
  }
}
