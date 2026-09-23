var e=1e3,t=1001,n=1002,r=1003,i=1004,a=1005,o=1006,s=1007,c=1008,l=1009,u=1012,d=1014,f=1015,p=1016,m=1017,h=1018,g=1020,_=1023,v=1026,y=1027,b=1028,x=1029,S=1030,C=1031,w=1033,T=2300,E=2301,D=2302,O=2303,k=2400,A=2401,j=2402,M=2500,ee=2501,N=`srgb`,te=`srgb-linear`,ne=`linear`,P=`srgb`,re=7680,ie=35044,ae=35048,oe=2e3;function se(e){for(let t=e.length-1;t>=0;--t)if(e[t]>=65535)return!0;return!1}function ce(e){return ArrayBuffer.isView(e)&&!(e instanceof DataView)}function le(e){return document.createElementNS(`http://www.w3.org/1999/xhtml`,e)}function ue(){let e=le(`canvas`);return e.style.display=`block`,e}var de={};function fe(...e){let t=`THREE.`+e.shift();console.log(t,...e)}function pe(e){let t=e[0];if(typeof t==`string`&&t.startsWith(`TSL:`)){let t=e[1];t&&t.isStackTrace?e[0]+=` `+t.getLocation():e[1]=`Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.`}return e}function F(...e){e=pe(e);let t=`THREE.`+e.shift();{let n=e[0];n&&n.isStackTrace?console.warn(n.getError(t)):console.warn(t,...e)}}function me(...e){e=pe(e);let t=`THREE.`+e.shift();{let n=e[0];n&&n.isStackTrace?console.error(n.getError(t)):console.error(t,...e)}}function he(...e){let t=e.join(` `);t in de||(de[t]=!0,F(...e))}function ge(e,t,n){return new Promise(function(r,i){function a(){switch(e.clientWaitSync(t,e.SYNC_FLUSH_COMMANDS_BIT,0)){case e.WAIT_FAILED:i();break;case e.TIMEOUT_EXPIRED:setTimeout(a,n);break;default:r()}}setTimeout(a,n)})}var _e={0:1,2:6,4:7,3:5,1:0,6:2,7:4,5:3},ve=class{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});let n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){let n=this._listeners;return n!==void 0&&n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){let n=this._listeners;if(n===void 0)return;let r=n[e];if(r!==void 0){let e=r.indexOf(t);e!==-1&&r.splice(e,1)}}dispatchEvent(e){let t=this._listeners;if(t===void 0)return;let n=t[e.type];if(n!==void 0){e.target=this;let t=n.slice(0);for(let n=0,r=t.length;n<r;n++)t[n].call(this,e);e.target=null}}},ye=`00.01.02.03.04.05.06.07.08.09.0a.0b.0c.0d.0e.0f.10.11.12.13.14.15.16.17.18.19.1a.1b.1c.1d.1e.1f.20.21.22.23.24.25.26.27.28.29.2a.2b.2c.2d.2e.2f.30.31.32.33.34.35.36.37.38.39.3a.3b.3c.3d.3e.3f.40.41.42.43.44.45.46.47.48.49.4a.4b.4c.4d.4e.4f.50.51.52.53.54.55.56.57.58.59.5a.5b.5c.5d.5e.5f.60.61.62.63.64.65.66.67.68.69.6a.6b.6c.6d.6e.6f.70.71.72.73.74.75.76.77.78.79.7a.7b.7c.7d.7e.7f.80.81.82.83.84.85.86.87.88.89.8a.8b.8c.8d.8e.8f.90.91.92.93.94.95.96.97.98.99.9a.9b.9c.9d.9e.9f.a0.a1.a2.a3.a4.a5.a6.a7.a8.a9.aa.ab.ac.ad.ae.af.b0.b1.b2.b3.b4.b5.b6.b7.b8.b9.ba.bb.bc.bd.be.bf.c0.c1.c2.c3.c4.c5.c6.c7.c8.c9.ca.cb.cc.cd.ce.cf.d0.d1.d2.d3.d4.d5.d6.d7.d8.d9.da.db.dc.dd.de.df.e0.e1.e2.e3.e4.e5.e6.e7.e8.e9.ea.eb.ec.ed.ee.ef.f0.f1.f2.f3.f4.f5.f6.f7.f8.f9.fa.fb.fc.fd.fe.ff`.split(`.`),be=1234567,xe=Math.PI/180,Se=180/Math.PI;function Ce(){let e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0,r=Math.random()*4294967295|0;return(ye[e&255]+ye[e>>8&255]+ye[e>>16&255]+ye[e>>24&255]+`-`+ye[t&255]+ye[t>>8&255]+`-`+ye[t>>16&15|64]+ye[t>>24&255]+`-`+ye[n&63|128]+ye[n>>8&255]+`-`+ye[n>>16&255]+ye[n>>24&255]+ye[r&255]+ye[r>>8&255]+ye[r>>16&255]+ye[r>>24&255]).toLowerCase()}function I(e,t,n){return Math.max(t,Math.min(n,e))}function we(e,t){return(e%t+t)%t}function Te(e,t,n,r,i){return r+(e-t)*(i-r)/(n-t)}function Ee(e,t,n){return e===t?0:(n-e)/(t-e)}function De(e,t,n){return(1-n)*e+n*t}function Oe(e,t,n,r){return De(e,t,1-Math.exp(-n*r))}function ke(e,t=1){return t-Math.abs(we(e,t*2)-t)}function Ae(e,t,n){return e<=t?0:e>=n?1:(e=(e-t)/(n-t),e*e*(3-2*e))}function je(e,t,n){return e<=t?0:e>=n?1:(e=(e-t)/(n-t),e*e*e*(e*(e*6-15)+10))}function Me(e,t){return e+Math.floor(Math.random()*(t-e+1))}function Ne(e,t){return e+Math.random()*(t-e)}function Pe(e){return e*(.5-Math.random())}function Fe(e){e!==void 0&&(be=e);let t=be+=1831565813;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}function Ie(e){return e*xe}function Le(e){return e*Se}function Re(e){return e>0&&Number.isInteger(e)&&2**Math.round(Math.log2(e))===e}function L(e){return 2**Math.ceil(Math.log(e)/Math.LN2)}function ze(e){return 2**Math.floor(Math.log(e)/Math.LN2)}function Be(e,t,n,r,i){let a=Math.cos,o=Math.sin,s=a(n/2),c=o(n/2),l=a((t+r)/2),u=o((t+r)/2),d=a((t-r)/2),f=o((t-r)/2),p=a((r-t)/2),m=o((r-t)/2);switch(i){case`XYX`:e.set(s*u,c*d,c*f,s*l);break;case`YZY`:e.set(c*f,s*u,c*d,s*l);break;case`ZXZ`:e.set(c*d,c*f,s*u,s*l);break;case`XZX`:e.set(s*u,c*m,c*p,s*l);break;case`YXY`:e.set(c*p,s*u,c*m,s*l);break;case`ZYZ`:e.set(c*m,c*p,s*u,s*l);break;default:F(`MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: `+i)}}function Ve(e,t){switch(t.constructor){case Float32Array:return e;case Uint32Array:return e/4294967295;case Uint16Array:return e/65535;case Uint8Array:case Uint8ClampedArray:return e/255;case Int32Array:return Math.max(e/2147483647,-1);case Int16Array:return Math.max(e/32767,-1);case Int8Array:return Math.max(e/127,-1);default:throw Error(`THREE.MathUtils: Invalid component type.`)}}function R(e,t){switch(t.constructor){case Float32Array:return e;case Uint32Array:return Math.round(e*4294967295);case Uint16Array:return Math.round(e*65535);case Uint8Array:case Uint8ClampedArray:return Math.round(e*255);case Int32Array:return Math.round(e*2147483647);case Int16Array:return Math.round(e*32767);case Int8Array:return Math.round(e*127);default:throw Error(`THREE.MathUtils: Invalid component type.`)}}var He={DEG2RAD:xe,RAD2DEG:Se,generateUUID:Ce,clamp:I,euclideanModulo:we,mapLinear:Te,inverseLerp:Ee,lerp:De,damp:Oe,pingpong:ke,smoothstep:Ae,smootherstep:je,randInt:Me,randFloat:Ne,randFloatSpread:Pe,seededRandom:Fe,degToRad:Ie,radToDeg:Le,isPowerOfTwo:Re,ceilPowerOfTwo:L,floorPowerOfTwo:ze,setQuaternionFromProperEuler:Be,normalize:R,denormalize:Ve},z=class e{static{e.prototype.isVector2=!0}constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw Error(`THREE.Vector2: index is out of range: `+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw Error(`THREE.Vector2: index is out of range: `+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){let t=this.x,n=this.y,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6],this.y=r[1]*t+r[4]*n+r[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=I(this.x,e.x,t.x),this.y=I(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=I(this.x,e,t),this.y=I(this.y,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(I(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(I(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){let n=Math.cos(t),r=Math.sin(t),i=this.x-e.x,a=this.y-e.y;return this.x=i*n-a*r+e.x,this.y=i*r+a*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}},B=class{constructor(e=0,t=0,n=0,r=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=r}static slerpFlat(e,t,n,r,i,a,o){let s=n[r+0],c=n[r+1],l=n[r+2],u=n[r+3],d=i[a+0],f=i[a+1],p=i[a+2],m=i[a+3];if(u!==m||s!==d||c!==f||l!==p){let e=s*d+c*f+l*p+u*m;e<0&&(d=-d,f=-f,p=-p,m=-m,e=-e);let t=1-o;if(e<.9995){let n=Math.acos(e),r=Math.sin(n);t=Math.sin(t*n)/r,o=Math.sin(o*n)/r,s=s*t+d*o,c=c*t+f*o,l=l*t+p*o,u=u*t+m*o}else{s=s*t+d*o,c=c*t+f*o,l=l*t+p*o,u=u*t+m*o;let e=1/Math.sqrt(s*s+c*c+l*l+u*u);s*=e,c*=e,l*=e,u*=e}}e[t]=s,e[t+1]=c,e[t+2]=l,e[t+3]=u}static multiplyQuaternionsFlat(e,t,n,r,i,a){let o=n[r],s=n[r+1],c=n[r+2],l=n[r+3],u=i[a],d=i[a+1],f=i[a+2],p=i[a+3];return e[t]=o*p+l*u+s*f-c*d,e[t+1]=s*p+l*d+c*u-o*f,e[t+2]=c*p+l*f+o*d-s*u,e[t+3]=l*p-o*u-s*d-c*f,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,r){return this._x=e,this._y=t,this._z=n,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){let n=e._x,r=e._y,i=e._z,a=e._order,o=Math.cos,s=Math.sin,c=o(n/2),l=o(r/2),u=o(i/2),d=s(n/2),f=s(r/2),p=s(i/2);switch(a){case`XYZ`:this._x=d*l*u+c*f*p,this._y=c*f*u-d*l*p,this._z=c*l*p+d*f*u,this._w=c*l*u-d*f*p;break;case`YXZ`:this._x=d*l*u+c*f*p,this._y=c*f*u-d*l*p,this._z=c*l*p-d*f*u,this._w=c*l*u+d*f*p;break;case`ZXY`:this._x=d*l*u-c*f*p,this._y=c*f*u+d*l*p,this._z=c*l*p+d*f*u,this._w=c*l*u-d*f*p;break;case`ZYX`:this._x=d*l*u-c*f*p,this._y=c*f*u+d*l*p,this._z=c*l*p-d*f*u,this._w=c*l*u+d*f*p;break;case`YZX`:this._x=d*l*u+c*f*p,this._y=c*f*u+d*l*p,this._z=c*l*p-d*f*u,this._w=c*l*u-d*f*p;break;case`XZY`:this._x=d*l*u-c*f*p,this._y=c*f*u-d*l*p,this._z=c*l*p+d*f*u,this._w=c*l*u+d*f*p;break;default:F(`Quaternion: .setFromEuler() encountered an unknown order: `+a)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){let n=t/2,r=Math.sin(n);return this._x=e.x*r,this._y=e.y*r,this._z=e.z*r,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){let t=e.elements,n=t[0],r=t[4],i=t[8],a=t[1],o=t[5],s=t[9],c=t[2],l=t[6],u=t[10],d=n+o+u;if(d>0){let e=.5/Math.sqrt(d+1);this._w=.25/e,this._x=(l-s)*e,this._y=(i-c)*e,this._z=(a-r)*e}else if(n>o&&n>u){let e=2*Math.sqrt(1+n-o-u);this._w=(l-s)/e,this._x=.25*e,this._y=(r+a)/e,this._z=(i+c)/e}else if(o>u){let e=2*Math.sqrt(1+o-n-u);this._w=(i-c)/e,this._x=(r+a)/e,this._y=.25*e,this._z=(s+l)/e}else{let e=2*Math.sqrt(1+u-n-o);this._w=(a-r)/e,this._x=(i+c)/e,this._y=(s+l)/e,this._z=.25*e}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(I(this.dot(e),-1,1)))}rotateTowards(e,t){let n=this.angleTo(e);if(n===0)return this;let r=Math.min(1,t/n);return this.slerp(e,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x*=e,this._y*=e,this._z*=e,this._w*=e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){let n=e._x,r=e._y,i=e._z,a=e._w,o=t._x,s=t._y,c=t._z,l=t._w;return this._x=n*l+a*o+r*c-i*s,this._y=r*l+a*s+i*o-n*c,this._z=i*l+a*c+n*s-r*o,this._w=a*l-n*o-r*s-i*c,this._onChangeCallback(),this}slerp(e,t){let n=e._x,r=e._y,i=e._z,a=e._w,o=this.dot(e);o<0&&(n=-n,r=-r,i=-i,a=-a,o=-o);let s=1-t;if(o<.9995){let e=Math.acos(o),c=Math.sin(e);s=Math.sin(s*e)/c,t=Math.sin(t*e)/c,this._x=this._x*s+n*t,this._y=this._y*s+r*t,this._z=this._z*s+i*t,this._w=this._w*s+a*t,this._onChangeCallback()}else this._x=this._x*s+n*t,this._y=this._y*s+r*t,this._z=this._z*s+i*t,this._w=this._w*s+a*t,this.normalize();return this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){let e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),r=Math.sqrt(1-n),i=Math.sqrt(n);return this.set(r*Math.sin(e),r*Math.cos(e),i*Math.sin(t),i*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},V=class e{static{e.prototype.isVector3=!0}constructor(e=0,t=0,n=0){this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw Error(`THREE.Vector3: index is out of range: `+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw Error(`THREE.Vector3: index is out of range: `+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(We.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(We.setFromAxisAngle(e,t))}applyMatrix3(e){let t=this.x,n=this.y,r=this.z,i=e.elements;return this.x=i[0]*t+i[3]*n+i[6]*r,this.y=i[1]*t+i[4]*n+i[7]*r,this.z=i[2]*t+i[5]*n+i[8]*r,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){let t=this.x,n=this.y,r=this.z,i=e.elements,a=1/(i[3]*t+i[7]*n+i[11]*r+i[15]);return this.x=(i[0]*t+i[4]*n+i[8]*r+i[12])*a,this.y=(i[1]*t+i[5]*n+i[9]*r+i[13])*a,this.z=(i[2]*t+i[6]*n+i[10]*r+i[14])*a,this}applyQuaternion(e){let t=this.x,n=this.y,r=this.z,i=e.x,a=e.y,o=e.z,s=e.w,c=2*(a*r-o*n),l=2*(o*t-i*r),u=2*(i*n-a*t);return this.x=t+s*c+a*u-o*l,this.y=n+s*l+o*c-i*u,this.z=r+s*u+i*l-a*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){let t=this.x,n=this.y,r=this.z,i=e.elements;return this.x=i[0]*t+i[4]*n+i[8]*r,this.y=i[1]*t+i[5]*n+i[9]*r,this.z=i[2]*t+i[6]*n+i[10]*r,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=I(this.x,e.x,t.x),this.y=I(this.y,e.y,t.y),this.z=I(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=I(this.x,e,t),this.y=I(this.y,e,t),this.z=I(this.z,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(I(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){let n=e.x,r=e.y,i=e.z,a=t.x,o=t.y,s=t.z;return this.x=r*s-i*o,this.y=i*a-n*s,this.z=n*o-r*a,this}projectOnVector(e){let t=e.lengthSq();if(t===0)return this.set(0,0,0);let n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return Ue.copy(this).projectOnVector(e),this.sub(Ue)}reflect(e){return this.sub(Ue.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(I(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y,r=this.z-e.z;return t*t+n*n+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){let r=Math.sin(t)*e;return this.x=r*Math.sin(n),this.y=Math.cos(t)*e,this.z=r*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){let t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),r=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=r,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}},Ue=new V,We=new B,Ge=class e{static{e.prototype.isMatrix3=!0}constructor(e,t,n,r,i,a,o,s,c){this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,r,i,a,o,s,c)}set(e,t,n,r,i,a,o,s,c){let l=this.elements;return l[0]=e,l[1]=r,l[2]=o,l[3]=t,l[4]=i,l[5]=s,l[6]=n,l[7]=a,l[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){let t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,r=t.elements,i=this.elements,a=n[0],o=n[3],s=n[6],c=n[1],l=n[4],u=n[7],d=n[2],f=n[5],p=n[8],m=r[0],h=r[3],g=r[6],_=r[1],v=r[4],y=r[7],b=r[2],x=r[5],S=r[8];return i[0]=a*m+o*_+s*b,i[3]=a*h+o*v+s*x,i[6]=a*g+o*y+s*S,i[1]=c*m+l*_+u*b,i[4]=c*h+l*v+u*x,i[7]=c*g+l*y+u*S,i[2]=d*m+f*_+p*b,i[5]=d*h+f*v+p*x,i[8]=d*g+f*y+p*S,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[1],r=e[2],i=e[3],a=e[4],o=e[5],s=e[6],c=e[7],l=e[8];return t*a*l-t*o*c-n*i*l+n*o*s+r*i*c-r*a*s}invert(){let e=this.elements,t=e[0],n=e[1],r=e[2],i=e[3],a=e[4],o=e[5],s=e[6],c=e[7],l=e[8],u=l*a-o*c,d=o*s-l*i,f=c*i-a*s,p=t*u+n*d+r*f;if(p===0)return this.set(0,0,0,0,0,0,0,0,0);let m=1/p;return e[0]=u*m,e[1]=(r*c-l*n)*m,e[2]=(o*n-r*a)*m,e[3]=d*m,e[4]=(l*t-r*s)*m,e[5]=(r*i-o*t)*m,e[6]=f*m,e[7]=(n*s-c*t)*m,e[8]=(a*t-n*i)*m,this}transpose(){let e,t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){let t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,r,i,a,o){let s=Math.cos(i),c=Math.sin(i);return this.set(n*s,n*c,-n*(s*a+c*o)+a+e,-r*c,r*s,-r*(-c*a+s*o)+o+t,0,0,1),this}scale(e,t){return he(`Matrix3: .scale() is deprecated. Use .makeScale() instead.`),this.premultiply(Ke.makeScale(e,t)),this}rotate(e){return he(`Matrix3: .rotate() is deprecated. Use .makeRotation() instead.`),this.premultiply(Ke.makeRotation(-e)),this}translate(e,t){return he(`Matrix3: .translate() is deprecated. Use .makeTranslation() instead.`),this.premultiply(Ke.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){let t=this.elements,n=e.elements;for(let e=0;e<9;e++)if(t[e]!==n[e])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}},Ke=new Ge,qe=new Ge().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Je=new Ge().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Ye(){let e={enabled:!0,workingColorSpace:te,spaces:{},convert:function(e,t,n){return this.enabled===!1||t===n||!t||!n?e:(this.spaces[t].transfer===`srgb`&&(e.r=Ze(e.r),e.g=Ze(e.g),e.b=Ze(e.b)),this.spaces[t].primaries!==this.spaces[n].primaries&&(e.applyMatrix3(this.spaces[t].toXYZ),e.applyMatrix3(this.spaces[n].fromXYZ)),this.spaces[n].transfer===`srgb`&&(e.r=Qe(e.r),e.g=Qe(e.g),e.b=Qe(e.b)),e)},workingToColorSpace:function(e,t){return this.convert(e,this.workingColorSpace,t)},colorSpaceToWorking:function(e,t){return this.convert(e,t,this.workingColorSpace)},getPrimaries:function(e){return this.spaces[e].primaries},getTransfer:function(e){return e===``?ne:this.spaces[e].transfer},getToneMappingMode:function(e){return this.spaces[e].outputColorSpaceConfig.toneMappingMode||`standard`},getLuminanceCoefficients:function(e,t=this.workingColorSpace){return e.fromArray(this.spaces[t].luminanceCoefficients)},define:function(e){Object.assign(this.spaces,e)},_getMatrix:function(e,t,n){return e.copy(this.spaces[t].toXYZ).multiply(this.spaces[n].fromXYZ)},_getDrawingBufferColorSpace:function(e){return this.spaces[e].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(e=this.workingColorSpace){return this.spaces[e].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(t,n){return he(`ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace().`),e.workingToColorSpace(t,n)},toWorkingColorSpace:function(t,n){return he(`ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking().`),e.colorSpaceToWorking(t,n)}},t=[.64,.33,.3,.6,.15,.06],n=[.2126,.7152,.0722],r=[.3127,.329];return e.define({[te]:{primaries:t,whitePoint:r,transfer:ne,toXYZ:qe,fromXYZ:Je,luminanceCoefficients:n,workingColorSpaceConfig:{unpackColorSpace:N},outputColorSpaceConfig:{drawingBufferColorSpace:N}},[N]:{primaries:t,whitePoint:r,transfer:P,toXYZ:qe,fromXYZ:Je,luminanceCoefficients:n,outputColorSpaceConfig:{drawingBufferColorSpace:N}}}),e}var Xe=Ye();function Ze(e){return e<.04045?e*.0773993808:(e*.9478672986+.0521327014)**2.4}function Qe(e){return e<.0031308?e*12.92:1.055*e**.41666-.055}var $e,et=class{static getDataURL(e,t=`image/png`){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>`u`)return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{$e===void 0&&($e=le(`canvas`)),$e.width=e.width,$e.height=e.height;let t=$e.getContext(`2d`);e instanceof ImageData?t.putImageData(e,0,0):t.drawImage(e,0,0,e.width,e.height),n=$e}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap){let t=le(`canvas`);t.width=e.width,t.height=e.height;let n=t.getContext(`2d`);n.drawImage(e,0,0,e.width,e.height);let r=n.getImageData(0,0,e.width,e.height),i=r.data;for(let e=0;e<i.length;e++)i[e]=Ze(i[e]/255)*255;return n.putImageData(r,0,0),t}if(e.data){let t=e.data.slice(0);for(let e=0;e<t.length;e++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[e]=Math.floor(Ze(t[e]/255)*255):t[e]=Ze(t[e]);return{data:t,width:e.width,height:e.height}}return F(`ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied.`),e}},tt=0,nt=class{constructor(e=null){this.isTextureSource=!0,Object.defineProperty(this,"id",{value:tt++}),this.uuid=Ce(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){let t=this.data;return typeof HTMLVideoElement<`u`&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<`u`&&t instanceof VideoFrame?e.set(t.displayWidth,t.displayHeight,0):t===null?e.set(0,0,0):e.set(t.width,t.height,t.depth||0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){let t=e===void 0||typeof e==`string`;if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];let n={uuid:this.uuid,url:``},r=this.data;if(r!==null){let e;if(Array.isArray(r)){e=[];for(let t=0,n=r.length;t<n;t++)r[t].isDataTexture?e.push(rt(r[t].image)):e.push(rt(r[t]))}else e=rt(r);n.url=e}return t||(e.images[this.uuid]=n),n}};function rt(e){return typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap?et.getDataURL(e):e.data?{data:Array.from(e.data),width:e.width,height:e.height,type:e.data.constructor.name}:(F(`Texture: Unable to serialize Texture.`),{})}var it=0,at=new V,ot=class r extends ve{constructor(e=r.DEFAULT_IMAGE,n=r.DEFAULT_MAPPING,i=t,a=t,s=o,u=c,d=_,f=l,p=r.DEFAULT_ANISOTROPY,m=``){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:it++}),this.uuid=Ce(),this.name=``,this.source=new nt(e),this.mipmaps=[],this.mapping=n,this.channel=0,this.wrapS=i,this.wrapT=a,this.magFilter=s,this.minFilter=u,this.anisotropy=p,this.format=d,this.internalFormat=null,this.type=f,this.offset=new z(0,0),this.repeat=new z(1,1),this.center=new z(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Ge,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=m,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(at).x}get height(){return this.source.getSize(at).y}get depth(){return this.source.getSize(at).z}get image(){return this.source.data}set image(e){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.normalized=e.normalized,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(let t in e){let n=e[t];if(n===void 0){F(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}let r=this[t];if(r===void 0){F(`Texture.setValues(): property '${t}' does not exist.`);continue}r&&n&&r.isVector2&&n.isVector2||r&&n&&r.isVector3&&n.isVector3||r&&n&&r.isMatrix3&&n.isMatrix3?r.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e==`string`;if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];let n={metadata:{version:4.7,type:`Texture`,generator:`Texture.toJSON`},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:`dispose`})}transformUv(r){if(this.mapping!==300)return r;if(r.applyMatrix3(this.matrix),r.x<0||r.x>1)switch(this.wrapS){case e:r.x-=Math.floor(r.x);break;case t:r.x=r.x<0?0:1;break;case n:Math.abs(Math.floor(r.x)%2)===1?r.x=Math.ceil(r.x)-r.x:r.x-=Math.floor(r.x)}if(r.y<0||r.y>1)switch(this.wrapT){case e:r.y-=Math.floor(r.y);break;case t:r.y=r.y<0?0:1;break;case n:Math.abs(Math.floor(r.y)%2)===1?r.y=Math.ceil(r.y)-r.y:r.y-=Math.floor(r.y)}return this.flipY&&(r.y=1-r.y),r}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}};ot.DEFAULT_IMAGE=null,ot.DEFAULT_MAPPING=300,ot.DEFAULT_ANISOTROPY=1;var st=class e{static{e.prototype.isVector4=!0}constructor(e=0,t=0,n=0,r=1){this.x=e,this.y=t,this.z=n,this.w=r}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,r){return this.x=e,this.y=t,this.z=n,this.w=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw Error(`THREE.Vector4: index is out of range: `+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw Error(`THREE.Vector4: index is out of range: `+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w===void 0?1:e.w,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){let t=this.x,n=this.y,r=this.z,i=this.w,a=e.elements;return this.x=a[0]*t+a[4]*n+a[8]*r+a[12]*i,this.y=a[1]*t+a[5]*n+a[9]*r+a[13]*i,this.z=a[2]*t+a[6]*n+a[10]*r+a[14]*i,this.w=a[3]*t+a[7]*n+a[11]*r+a[15]*i,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);let t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,r,i,a=.01,o=.1,s=e.elements,c=s[0],l=s[4],u=s[8],d=s[1],f=s[5],p=s[9],m=s[2],h=s[6],g=s[10];if(Math.abs(l-d)<a&&Math.abs(u-m)<a&&Math.abs(p-h)<a){if(Math.abs(l+d)<o&&Math.abs(u+m)<o&&Math.abs(p+h)<o&&Math.abs(c+f+g-3)<o)return this.set(1,0,0,0),this;t=Math.PI;let e=(c+1)/2,s=(f+1)/2,_=(g+1)/2,v=(l+d)/4,y=(u+m)/4,b=(p+h)/4;return e>s&&e>_?e<a?(n=0,r=.707106781,i=.707106781):(n=Math.sqrt(e),r=v/n,i=y/n):s>_?s<a?(n=.707106781,r=0,i=.707106781):(r=Math.sqrt(s),n=v/r,i=b/r):_<a?(n=.707106781,r=.707106781,i=0):(i=Math.sqrt(_),n=y/i,r=b/i),this.set(n,r,i,t),this}let _=Math.sqrt((h-p)*(h-p)+(u-m)*(u-m)+(d-l)*(d-l));return Math.abs(_)<.001&&(_=1),this.x=(h-p)/_,this.y=(u-m)/_,this.z=(d-l)/_,this.w=Math.acos((c+f+g-1)/2),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=I(this.x,e.x,t.x),this.y=I(this.y,e.y,t.y),this.z=I(this.z,e.z,t.z),this.w=I(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=I(this.x,e,t),this.y=I(this.y,e,t),this.z=I(this.z,e,t),this.w=I(this.w,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(I(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}},ct=class extends ve{constructor(e=1,t=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:o,depthBuffer:!0,stencilBuffer:!1,resolveColorBuffer:!0,resolveDepthBuffer:!0,resolveStencilBuffer:!0,storeMultisampledColorBuffer:!0,storeMultisampledDepthBuffer:!0,storeMultisampledStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new st(0,0,e,t),this.scissorTest=!1,this.viewport=new st(0,0,e,t),this.textures=[];let r=new ot({width:e,height:t,depth:n.depth}),i=n.count;for(let e=0;e<i;e++)this.textures[e]=r.clone(),this.textures[e].isRenderTargetTexture=!0,this.textures[e].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveColorBuffer=n.resolveColorBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this.storeMultisampledColorBuffer=n.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=n.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=n.storeMultisampledStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview,this.useArrayDepthTexture=n.useArrayDepthTexture}_setTextureOptions(e={}){let t={minFilter:o,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let e=0;e<this.textures.length;e++)this.textures[e].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&this._depthTexture.renderTarget===this&&(this._depthTexture.renderTarget=null),e!==null&&e.renderTarget===null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let r=0,i=this.textures.length;r<i;r++)this.textures[r].image.width=e,this.textures[r].image.height=t,this.textures[r].image.depth=n,this.textures[r].isData3DTexture!==!0&&(this.textures[r].isArrayTexture=this.textures[r].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;let n=Object.assign({},e.textures[t].image);this.textures[t].source=new nt(n)}if(this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveColorBuffer=e.resolveColorBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,this.storeMultisampledColorBuffer=e.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=e.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=e.storeMultisampledStencilBuffer,e.depthTexture!==null){if(e.depthTexture.renderTarget===e){let t=e.depthTexture.clone();t.renderTarget=null,this.depthTexture=t}else this.depthTexture=e.depthTexture}return this.samples=e.samples,this.multiview=e.multiview,this.useArrayDepthTexture=e.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:`dispose`})}},lt=class extends ct{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}},ut=class extends ot{constructor(e=null,n=1,i=1,a=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:n,height:i,depth:a},this.magFilter=r,this.minFilter=r,this.wrapR=t,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}copy(e){return super.copy(e),this.wrapR=e.wrapR,this}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}},dt=class extends ot{constructor(e=null,n=1,i=1,a=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:n,height:i,depth:a},this.magFilter=r,this.minFilter=r,this.wrapR=t,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}copy(e){return super.copy(e),this.wrapR=e.wrapR,this}},ft=class e{static{e.prototype.isMatrix4=!0}constructor(e,t,n,r,i,a,o,s,c,l,u,d,f,p,m,h){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,r,i,a,o,s,c,l,u,d,f,p,m,h)}set(e,t,n,r,i,a,o,s,c,l,u,d,f,p,m,h){let g=this.elements;return g[0]=e,g[4]=t,g[8]=n,g[12]=r,g[1]=i,g[5]=a,g[9]=o,g[13]=s,g[2]=c,g[6]=l,g[10]=u,g[14]=d,g[3]=f,g[7]=p,g[11]=m,g[15]=h,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new e().fromArray(this.elements)}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){let t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){let t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return this.determinantAffine()===0?(e.set(1,0,0),t.set(0,1,0),n.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){if(e.determinantAffine()===0)return this.identity();let t=this.elements,n=e.elements,r=1/pt.setFromMatrixColumn(e,0).length(),i=1/pt.setFromMatrixColumn(e,1).length(),a=1/pt.setFromMatrixColumn(e,2).length();return t[0]=n[0]*r,t[1]=n[1]*r,t[2]=n[2]*r,t[3]=0,t[4]=n[4]*i,t[5]=n[5]*i,t[6]=n[6]*i,t[7]=0,t[8]=n[8]*a,t[9]=n[9]*a,t[10]=n[10]*a,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){let t=this.elements,n=e.x,r=e.y,i=e.z,a=Math.cos(n),o=Math.sin(n),s=Math.cos(r),c=Math.sin(r),l=Math.cos(i),u=Math.sin(i);if(e.order===`XYZ`){let e=a*l,n=a*u,r=o*l,i=o*u;t[0]=s*l,t[4]=-s*u,t[8]=c,t[1]=n+r*c,t[5]=e-i*c,t[9]=-o*s,t[2]=i-e*c,t[6]=r+n*c,t[10]=a*s}else if(e.order===`YXZ`){let e=s*l,n=s*u,r=c*l,i=c*u;t[0]=e+i*o,t[4]=r*o-n,t[8]=a*c,t[1]=a*u,t[5]=a*l,t[9]=-o,t[2]=n*o-r,t[6]=i+e*o,t[10]=a*s}else if(e.order===`ZXY`){let e=s*l,n=s*u,r=c*l,i=c*u;t[0]=e-i*o,t[4]=-a*u,t[8]=r+n*o,t[1]=n+r*o,t[5]=a*l,t[9]=i-e*o,t[2]=-a*c,t[6]=o,t[10]=a*s}else if(e.order===`ZYX`){let e=a*l,n=a*u,r=o*l,i=o*u;t[0]=s*l,t[4]=r*c-n,t[8]=e*c+i,t[1]=s*u,t[5]=i*c+e,t[9]=n*c-r,t[2]=-c,t[6]=o*s,t[10]=a*s}else if(e.order===`YZX`){let e=a*s,n=a*c,r=o*s,i=o*c;t[0]=s*l,t[4]=i-e*u,t[8]=r*u+n,t[1]=u,t[5]=a*l,t[9]=-o*l,t[2]=-c*l,t[6]=n*u+r,t[10]=e-i*u}else if(e.order===`XZY`){let e=a*s,n=a*c,r=o*s,i=o*c;t[0]=s*l,t[4]=-u,t[8]=c*l,t[1]=e*u+i,t[5]=a*l,t[9]=n*u-r,t[2]=r*u-n,t[6]=o*l,t[10]=i*u+e}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(ht,e,gt)}lookAt(e,t,n){let r=this.elements;return yt.subVectors(e,t),yt.lengthSq()===0&&(yt.z=1),yt.normalize(),_t.crossVectors(n,yt),_t.lengthSq()===0&&(Math.abs(n.z)===1?yt.x+=1e-4:yt.z+=1e-4,yt.normalize(),_t.crossVectors(n,yt)),_t.normalize(),vt.crossVectors(yt,_t),r[0]=_t.x,r[4]=vt.x,r[8]=yt.x,r[1]=_t.y,r[5]=vt.y,r[9]=yt.y,r[2]=_t.z,r[6]=vt.z,r[10]=yt.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,r=t.elements,i=this.elements,a=n[0],o=n[4],s=n[8],c=n[12],l=n[1],u=n[5],d=n[9],f=n[13],p=n[2],m=n[6],h=n[10],g=n[14],_=n[3],v=n[7],y=n[11],b=n[15],x=r[0],S=r[4],C=r[8],w=r[12],T=r[1],E=r[5],D=r[9],O=r[13],k=r[2],A=r[6],j=r[10],M=r[14],ee=r[3],N=r[7],te=r[11],ne=r[15];return i[0]=a*x+o*T+s*k+c*ee,i[4]=a*S+o*E+s*A+c*N,i[8]=a*C+o*D+s*j+c*te,i[12]=a*w+o*O+s*M+c*ne,i[1]=l*x+u*T+d*k+f*ee,i[5]=l*S+u*E+d*A+f*N,i[9]=l*C+u*D+d*j+f*te,i[13]=l*w+u*O+d*M+f*ne,i[2]=p*x+m*T+h*k+g*ee,i[6]=p*S+m*E+h*A+g*N,i[10]=p*C+m*D+h*j+g*te,i[14]=p*w+m*O+h*M+g*ne,i[3]=_*x+v*T+y*k+b*ee,i[7]=_*S+v*E+y*A+b*N,i[11]=_*C+v*D+y*j+b*te,i[15]=_*w+v*O+y*M+b*ne,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[4],r=e[8],i=e[12],a=e[1],o=e[5],s=e[9],c=e[13],l=e[2],u=e[6],d=e[10],f=e[14],p=e[3],m=e[7],h=e[11],g=e[15],_=s*f-c*d,v=o*f-c*u,y=o*d-s*u,b=a*f-c*l,x=a*d-s*l,S=a*u-o*l;return t*(m*_-h*v+g*y)-n*(p*_-h*b+g*x)+r*(p*v-m*b+g*S)-i*(p*y-m*x+h*S)}determinantAffine(){let e=this.elements,t=e[0],n=e[4],r=e[8],i=e[1],a=e[5],o=e[9],s=e[2],c=e[6],l=e[10];return t*(a*l-o*c)-n*(i*l-o*s)+r*(i*c-a*s)}transpose(){let e=this.elements,t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){let r=this.elements;return e.isVector3?(r[12]=e.x,r[13]=e.y,r[14]=e.z):(r[12]=e,r[13]=t,r[14]=n),this}invert(){let e=this.elements,t=e[0],n=e[1],r=e[2],i=e[3],a=e[4],o=e[5],s=e[6],c=e[7],l=e[8],u=e[9],d=e[10],f=e[11],p=e[12],m=e[13],h=e[14],g=e[15],_=t*o-n*a,v=t*s-r*a,y=t*c-i*a,b=n*s-r*o,x=n*c-i*o,S=r*c-i*s,C=l*m-u*p,w=l*h-d*p,T=l*g-f*p,E=u*h-d*m,D=u*g-f*m,O=d*g-f*h,k=_*O-v*D+y*E+b*T-x*w+S*C;if(k===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let A=1/k;return e[0]=(o*O-s*D+c*E)*A,e[1]=(r*D-n*O-i*E)*A,e[2]=(m*S-h*x+g*b)*A,e[3]=(d*x-u*S-f*b)*A,e[4]=(s*T-a*O-c*w)*A,e[5]=(t*O-r*T+i*w)*A,e[6]=(h*y-p*S-g*v)*A,e[7]=(l*S-d*y+f*v)*A,e[8]=(a*D-o*T+c*C)*A,e[9]=(n*T-t*D-i*C)*A,e[10]=(p*x-m*y+g*_)*A,e[11]=(u*y-l*x-f*_)*A,e[12]=(o*w-a*E-s*C)*A,e[13]=(t*E-n*w+r*C)*A,e[14]=(m*v-p*b-h*_)*A,e[15]=(l*b-u*v+d*_)*A,this}scale(e){let t=this.elements,n=e.x,r=e.y,i=e.z;return t[0]*=n,t[4]*=r,t[8]*=i,t[1]*=n,t[5]*=r,t[9]*=i,t[2]*=n,t[6]*=r,t[10]*=i,t[3]*=n,t[7]*=r,t[11]*=i,this}getMaxScaleOnAxis(){let e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],r=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,r))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){let t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){let n=Math.cos(t),r=Math.sin(t),i=1-n,a=e.x,o=e.y,s=e.z,c=i*a,l=i*o;return this.set(c*a+n,c*o-r*s,c*s+r*o,0,c*o+r*s,l*o+n,l*s-r*a,0,c*s-r*o,l*s+r*a,i*s*s+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,r,i,a){return this.set(1,n,i,0,e,1,a,0,t,r,1,0,0,0,0,1),this}compose(e,t,n){let r=this.elements,i=t._x,a=t._y,o=t._z,s=t._w,c=i+i,l=a+a,u=o+o,d=i*c,f=i*l,p=i*u,m=a*l,h=a*u,g=o*u,_=s*c,v=s*l,y=s*u,b=n.x,x=n.y,S=n.z;return r[0]=(1-(m+g))*b,r[1]=(f+y)*b,r[2]=(p-v)*b,r[3]=0,r[4]=(f-y)*x,r[5]=(1-(d+g))*x,r[6]=(h+_)*x,r[7]=0,r[8]=(p+v)*S,r[9]=(h-_)*S,r[10]=(1-(d+m))*S,r[11]=0,r[12]=e.x,r[13]=e.y,r[14]=e.z,r[15]=1,this}decompose(e,t,n){let r=this.elements;e.x=r[12],e.y=r[13],e.z=r[14];let i=this.determinantAffine();if(i===0)return n.set(1,1,1),t.identity(),this;let a=pt.set(r[0],r[1],r[2]).length(),o=pt.set(r[4],r[5],r[6]).length(),s=pt.set(r[8],r[9],r[10]).length();i<0&&(a=-a),mt.copy(this);let c=1/a,l=1/o,u=1/s;return mt.elements[0]*=c,mt.elements[1]*=c,mt.elements[2]*=c,mt.elements[4]*=l,mt.elements[5]*=l,mt.elements[6]*=l,mt.elements[8]*=u,mt.elements[9]*=u,mt.elements[10]*=u,t.setFromRotationMatrix(mt),n.x=a,n.y=o,n.z=s,this}makePerspective(e,t,n,r,i,a,o=oe,s=!1){let c=this.elements,l=2*i/(t-e),u=2*i/(n-r),d=(t+e)/(t-e),f=(n+r)/(n-r),p,m;if(s)p=i/(a-i),m=a*i/(a-i);else if(o===2e3)p=-(a+i)/(a-i),m=-2*a*i/(a-i);else if(o===2001)p=-a/(a-i),m=-a*i/(a-i);else throw Error(`THREE.Matrix4.makePerspective(): Invalid coordinate system: `+o);return c[0]=l,c[4]=0,c[8]=d,c[12]=0,c[1]=0,c[5]=u,c[9]=f,c[13]=0,c[2]=0,c[6]=0,c[10]=p,c[14]=m,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,n,r,i,a,o=oe,s=!1){let c=this.elements,l=2/(t-e),u=2/(n-r),d=-(t+e)/(t-e),f=-(n+r)/(n-r),p,m;if(s)p=1/(a-i),m=a/(a-i);else if(o===2e3)p=-2/(a-i),m=-(a+i)/(a-i);else if(o===2001)p=-1/(a-i),m=-i/(a-i);else throw Error(`THREE.Matrix4.makeOrthographic(): Invalid coordinate system: `+o);return c[0]=l,c[4]=0,c[8]=0,c[12]=d,c[1]=0,c[5]=u,c[9]=0,c[13]=f,c[2]=0,c[6]=0,c[10]=p,c[14]=m,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){let t=this.elements,n=e.elements;for(let e=0;e<16;e++)if(t[e]!==n[e])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}},pt=new V,mt=new ft,ht=new V(0,0,0),gt=new V(1,1,1),_t=new V,vt=new V,yt=new V,bt=new ft,xt=new B,St=class e{constructor(t=0,n=0,r=0,i=e.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=n,this._z=r,this._order=i}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,r=this._order){return this._x=e,this._y=t,this._z=n,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){let r=e.elements,i=r[0],a=r[4],o=r[8],s=r[1],c=r[5],l=r[9],u=r[2],d=r[6],f=r[10];switch(t){case`XYZ`:this._y=Math.asin(I(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-l,f),this._z=Math.atan2(-a,i)):(this._x=Math.atan2(d,c),this._z=0);break;case`YXZ`:this._x=Math.asin(-I(l,-1,1)),Math.abs(l)<.9999999?(this._y=Math.atan2(o,f),this._z=Math.atan2(s,c)):(this._y=Math.atan2(-u,i),this._z=0);break;case`ZXY`:this._x=Math.asin(I(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-u,f),this._z=Math.atan2(-a,c)):(this._y=0,this._z=Math.atan2(s,i));break;case`ZYX`:this._y=Math.asin(-I(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(d,f),this._z=Math.atan2(s,i)):(this._x=0,this._z=Math.atan2(-a,c));break;case`YZX`:this._z=Math.asin(I(s,-1,1)),Math.abs(s)<.9999999?(this._x=Math.atan2(-l,c),this._y=Math.atan2(-u,i)):(this._x=0,this._y=Math.atan2(o,f));break;case`XZY`:this._z=Math.asin(-I(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(d,c),this._y=Math.atan2(o,i)):(this._x=Math.atan2(-l,f),this._y=0);break;default:F(`Euler: .setFromRotationMatrix() encountered an unknown order: `+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return bt.makeRotationFromQuaternion(e),this.setFromRotationMatrix(bt,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return xt.setFromEuler(this),this.setFromQuaternion(xt,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};St.DEFAULT_ORDER=`XYZ`;var Ct=class{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return!!(this.mask&(1<<e|0))}},wt=0,Tt=new V,Et=new B,Dt=new ft,Ot=new V,kt=new V,At=new V,jt=new B,Mt=new V(1,0,0),Nt=new V(0,1,0),Pt=new V(0,0,1),Ft={type:`added`},It={type:`removed`},Lt={type:`childadded`,child:null},Rt={type:`childremoved`,child:null},zt=class e extends ve{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:wt++}),this.uuid=Ce(),this.name=``,this.type=`Object3D`,this.parent=null,this.children=[],this.up=e.DEFAULT_UP.clone();let t=new V,n=new St,r=new B,i=new V(1,1,1);function a(){r.setFromEuler(n,!1)}function o(){n.setFromQuaternion(r,void 0,!1)}n._onChange(a),r._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:n},quaternion:{configurable:!0,enumerable:!0,value:r},scale:{configurable:!0,enumerable:!0,value:i},modelViewMatrix:{value:new ft},normalMatrix:{value:new Ge}}),this.matrix=new ft,this.matrixWorld=new ft,this.matrixAutoUpdate=e.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=e.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Ct,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return Et.setFromAxisAngle(e,t),this.quaternion.multiply(Et),this}rotateOnWorldAxis(e,t){return Et.setFromAxisAngle(e,t),this.quaternion.premultiply(Et),this}rotateX(e){return this.rotateOnAxis(Mt,e)}rotateY(e){return this.rotateOnAxis(Nt,e)}rotateZ(e){return this.rotateOnAxis(Pt,e)}translateOnAxis(e,t){return Tt.copy(e).applyQuaternion(this.quaternion),this.position.add(Tt.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(Mt,e)}translateY(e){return this.translateOnAxis(Nt,e)}translateZ(e){return this.translateOnAxis(Pt,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(Dt.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?Ot.copy(e):Ot.set(e,t,n);let r=this.parent;this.updateWorldMatrix(!0,!1),kt.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Dt.lookAt(kt,Ot,this.up):Dt.lookAt(Ot,kt,this.up),this.quaternion.setFromRotationMatrix(Dt),r&&(Dt.extractRotation(r.matrixWorld),Et.setFromRotationMatrix(Dt),this.quaternion.premultiply(Et.invert()))}add(e){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return e===this?(me(`Object3D.add: object can't be added as a child of itself.`,e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(Ft),Lt.child=e,this.dispatchEvent(Lt),Lt.child=null):me(`Object3D.add: object not an instance of THREE.Object3D.`,e),this)}remove(e){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.remove(arguments[e]);return this}let t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(It),Rt.child=e,this.dispatchEvent(Rt),Rt.child=null),this}removeFromParent(){let e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),Dt.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),Dt.multiply(e.parent.matrixWorld)),e.applyMatrix4(Dt),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(Ft),Lt.child=e,this.dispatchEvent(Lt),Lt.child=null,this}getObjectById(e){return this.getObjectByProperty(`id`,e)}getObjectByName(e){return this.getObjectByProperty(`name`,e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,r=this.children.length;n<r;n++){let r=this.children[n].getObjectByProperty(e,t);if(r!==void 0)return r}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);let r=this.children;for(let i=0,a=r.length;i<a;i++)r[i].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(kt,e,At),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(kt,jt,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);let t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}intersectsFrustum(){}traverse(e){e(this);let t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);let t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverseVisible(e)}traverseAncestors(e){let t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let e=this.pivot;if(e!==null){let t=e.x,n=e.y,r=e.z,i=this.matrix.elements;i[12]+=t-i[0]*t-i[4]*n-i[8]*r,i[13]+=n-i[1]*t-i[5]*n-i[9]*r,i[14]+=r-i[2]*t-i[6]*n-i[10]*r}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);let t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t,n=!1){let r=this.parent;if(e===!0&&r!==null&&r.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||n)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,n=!0),t===!0){let e=this.children;for(let t=0,r=e.length;t<r;t++)e[t].updateWorldMatrix(!1,!0,n)}}toJSON(e){let t=e===void 0||typeof e==`string`,n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:`Object`,generator:`Object3D.toJSON`});let r={};r.uuid=this.uuid,r.type=this.type,r.name=this.name,r.castShadow=this.castShadow,r.receiveShadow=this.receiveShadow,r.visible=this.visible,r.frustumCulled=this.frustumCulled,r.renderOrder=this.renderOrder,r.static=this.static,r.matrixAutoUpdate=this.matrixAutoUpdate,Object.keys(this.userData).length>0&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),r.up=this.up.toArray(),this.pivot!==null&&(r.pivot=this.pivot.toArray()),this.morphTargetDictionary!==void 0&&(r.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(r.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(r.type=`InstancedMesh`,r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(r.type=`BatchedMesh`,r.perObjectFrustumCulled=this.perObjectFrustumCulled,r.sortObjects=this.sortObjects,r.drawRanges=this._drawRanges,r.reservedRanges=this._reservedRanges,r.geometryInfo=this._geometryInfo.map(e=>({...e,boundingBox:e.boundingBox?e.boundingBox.toJSON():void 0,boundingSphere:e.boundingSphere?e.boundingSphere.toJSON():void 0})),r.instanceInfo=this._instanceInfo.map(e=>({...e})),r.availableInstanceIds=this._availableInstanceIds.slice(),r.availableGeometryIds=this._availableGeometryIds.slice(),r.nextIndexStart=this._nextIndexStart,r.nextVertexStart=this._nextVertexStart,r.geometryCount=this._geometryCount,r.maxInstanceCount=this._maxInstanceCount,r.maxVertexCount=this._maxVertexCount,r.maxIndexCount=this._maxIndexCount,r.geometryInitialized=this._geometryInitialized,r.matricesTexture=this._matricesTexture.toJSON(e),r.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(r.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(r.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(r.boundingBox=this.boundingBox.toJSON()));function i(t,n){return t[n.uuid]===void 0&&(t[n.uuid]=n.toJSON(e)),n.uuid}if(this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=i(e.geometries,this.geometry);let t=this.geometry.parameters;if(t!==void 0&&t.shapes!==void 0){let n=t.shapes;if(Array.isArray(n))for(let t=0,r=n.length;t<r;t++){let r=n[t];i(e.shapes,r)}else i(e.shapes,n)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(i(e.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0){if(Array.isArray(this.material)){let t=[];for(let n=0,r=this.material.length;n<r;n++)t.push(i(e.materials,this.material[n]));r.material=t}else r.material=i(e.materials,this.material)}if(this.children.length>0){r.children=[];for(let t=0;t<this.children.length;t++)r.children.push(this.children[t].toJSON(e).object)}if(this.animations.length>0){r.animations=[];for(let t=0;t<this.animations.length;t++){let n=this.animations[t];r.animations.push(i(e.animations,n))}}if(t){let t=a(e.geometries),r=a(e.materials),i=a(e.textures),o=a(e.images),s=a(e.shapes),c=a(e.skeletons),l=a(e.animations),u=a(e.nodes);t.length>0&&(n.geometries=t),r.length>0&&(n.materials=r),i.length>0&&(n.textures=i),o.length>0&&(n.images=o),s.length>0&&(n.shapes=s),c.length>0&&(n.skeletons=c),l.length>0&&(n.animations=l),u.length>0&&(n.nodes=u)}return n.object=r,n;function a(e){let t=[];for(let n in e){let r=e[n];delete r.metadata,t.push(r)}return t}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.pivot=e.pivot===null?null:e.pivot.clone(),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let t=0;t<e.children.length;t++){let n=e.children[t];this.add(n.clone())}return this}dispose(){this.dispatchEvent({type:`dispose`})}};zt.DEFAULT_UP=new V(0,1,0),zt.DEFAULT_MATRIX_AUTO_UPDATE=!0,zt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var H=class extends zt{constructor(){super(),this.isGroup=!0,this.type=`Group`}},Bt={type:`move`},Vt=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new H,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new H,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new V,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new V),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new H,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new V,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new V,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){let t=this._hand;if(t)for(let n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:`connected`,data:e}),this}disconnect(e){return this.dispatchEvent({type:`disconnected`,data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let r=null,i=null,a=null,o=this._targetRay,s=this._grip,c=this._hand;if(e&&t.session.visibilityState!==`visible-blurred`){if(c&&e.hand){a=!0;for(let r of e.hand.values()){let e=t.getJointPose(r,n),i=this._getHandJoint(c,r);e!==null&&(i.matrix.fromArray(e.transform.matrix),i.matrix.decompose(i.position,i.rotation,i.scale),i.matrixWorldNeedsUpdate=!0,i.jointRadius=e.radius),i.visible=e!==null}let r=c.joints[`index-finger-tip`],i=c.joints[`thumb-tip`],o=r.position.distanceTo(i.position);c.inputState.pinching&&o>.025?(c.inputState.pinching=!1,this.dispatchEvent({type:`pinchend`,handedness:e.handedness,target:this})):!c.inputState.pinching&&o<=.015&&(c.inputState.pinching=!0,this.dispatchEvent({type:`pinchstart`,handedness:e.handedness,target:this}))}else s!==null&&e.gripSpace&&(i=t.getPose(e.gripSpace,n),i!==null&&(s.matrix.fromArray(i.transform.matrix),s.matrix.decompose(s.position,s.rotation,s.scale),s.matrixWorldNeedsUpdate=!0,i.linearVelocity?(s.hasLinearVelocity=!0,s.linearVelocity.copy(i.linearVelocity)):s.hasLinearVelocity=!1,i.angularVelocity?(s.hasAngularVelocity=!0,s.angularVelocity.copy(i.angularVelocity)):s.hasAngularVelocity=!1,s.eventsEnabled&&s.dispatchEvent({type:`gripUpdated`,data:e,target:this})));o!==null&&(r=t.getPose(e.targetRaySpace,n),r===null&&i!==null&&(r=i),r!==null&&(o.matrix.fromArray(r.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,r.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(r.linearVelocity)):o.hasLinearVelocity=!1,r.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(r.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(Bt)))}return o!==null&&(o.visible=r!==null),s!==null&&(s.visible=i!==null),c!==null&&(c.visible=a!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){let n=new H;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}},Ht={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Ut={h:0,s:0,l:0},Wt={h:0,s:0,l:0};function Gt(e,t,n){return n<0&&(n+=1),n>1&&--n,n<1/6?e+(t-e)*6*n:n<1/2?t:n<2/3?e+(t-e)*6*(2/3-n):e}var U=class{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){let t=e;t&&t.isColor?this.copy(t):typeof t==`number`?this.setHex(t):typeof t==`string`&&this.setStyle(t)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=N){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,Xe.colorSpaceToWorking(this,t),this}setRGB(e,t,n,r=Xe.workingColorSpace){return this.r=e,this.g=t,this.b=n,Xe.colorSpaceToWorking(this,r),this}setHSL(e,t,n,r=Xe.workingColorSpace){if(e=we(e,1),t=I(t,0,1),n=I(n,0,1),t===0)this.r=this.g=this.b=n;else{let r=n<=.5?n*(1+t):n+t-n*t,i=2*n-r;this.r=Gt(i,r,e+1/3),this.g=Gt(i,r,e),this.b=Gt(i,r,e-1/3)}return Xe.colorSpaceToWorking(this,r),this}setStyle(e,t=N){function n(t){t!==void 0&&parseFloat(t)<1&&F(`Color: Alpha component of `+e+` will be ignored.`)}let r;if(r=/^(\w+)\(([^\)]*)\)/.exec(e)){let i,a=r[1],o=r[2];switch(a){case`rgb`:case`rgba`:if(i=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(i[4]),this.setRGB(Math.min(255,parseInt(i[1],10))/255,Math.min(255,parseInt(i[2],10))/255,Math.min(255,parseInt(i[3],10))/255,t);if(i=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(i[4]),this.setRGB(Math.min(100,parseInt(i[1],10))/100,Math.min(100,parseInt(i[2],10))/100,Math.min(100,parseInt(i[3],10))/100,t);break;case`hsl`:case`hsla`:if(i=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(i[4]),this.setHSL(parseFloat(i[1])/360,parseFloat(i[2])/100,parseFloat(i[3])/100,t);break;default:F(`Color: Unknown color model `+e)}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(e)){let n=r[1],i=n.length;if(i===3)return this.setRGB(parseInt(n.charAt(0),16)/15,parseInt(n.charAt(1),16)/15,parseInt(n.charAt(2),16)/15,t);if(i===6)return this.setHex(parseInt(n,16),t);F(`Color: Invalid hex color `+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=N){let n=Ht[e.toLowerCase()];return n===void 0?F(`Color: Unknown color `+e):this.setHex(n,t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=Ze(e.r),this.g=Ze(e.g),this.b=Ze(e.b),this}copyLinearToSRGB(e){return this.r=Qe(e.r),this.g=Qe(e.g),this.b=Qe(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=N){return Xe.workingToColorSpace(Kt.copy(this),e),Math.round(I(Kt.r*255,0,255))*65536+Math.round(I(Kt.g*255,0,255))*256+Math.round(I(Kt.b*255,0,255))}getHexString(e=N){return(`000000`+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=Xe.workingColorSpace){Xe.workingToColorSpace(Kt.copy(this),t);let n=Kt.r,r=Kt.g,i=Kt.b,a=Math.max(n,r,i),o=Math.min(n,r,i),s,c,l=(o+a)/2;if(o===a)s=0,c=0;else{let e=a-o;switch(c=l<=.5?e/(a+o):e/(2-a-o),a){case n:s=(r-i)/e+(r<i?6:0);break;case r:s=(i-n)/e+2;break;case i:s=(n-r)/e+4}s/=6}return e.h=s,e.s=c,e.l=l,e}getRGB(e,t=Xe.workingColorSpace){return Xe.workingToColorSpace(Kt.copy(this),t),e.r=Kt.r,e.g=Kt.g,e.b=Kt.b,e}getStyle(e=N){Xe.workingToColorSpace(Kt.copy(this),e);let t=Kt.r,n=Kt.g,r=Kt.b;return e===`srgb`?`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(r*255)})`:`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${r.toFixed(3)})`}offsetHSL(e,t,n){return this.getHSL(Ut),this.setHSL(Ut.h+e,Ut.s+t,Ut.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(Ut),e.getHSL(Wt);let n=De(Ut.h,Wt.h,t),r=De(Ut.s,Wt.s,t),i=De(Ut.l,Wt.l,t);return this.setHSL(n,r,i),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){let t=this.r,n=this.g,r=this.b,i=e.elements;return this.r=i[0]*t+i[3]*n+i[6]*r,this.g=i[1]*t+i[4]*n+i[7]*r,this.b=i[2]*t+i[5]*n+i[8]*r,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},Kt=new U;U.NAMES=Ht;var qt=class e{constructor(e,t=25e-5){this.isFogExp2=!0,this.name=``,this.color=new U(e),this.density=t}clone(){return new e(this.color,this.density)}toJSON(){return{type:`FogExp2`,name:this.name,color:this.color.getHex(),density:this.density}}},Jt=class extends zt{constructor(){super(),this.isScene=!0,this.type=`Scene`,this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new St,this.environmentIntensity=1,this.environmentRotation=new St,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`observe`,{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){let t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),t.object.backgroundBlurriness=this.backgroundBlurriness,t.object.backgroundIntensity=this.backgroundIntensity,t.object.backgroundRotation=this.backgroundRotation.toArray(),t.object.environmentIntensity=this.environmentIntensity,t.object.environmentRotation=this.environmentRotation.toArray(),t}},Yt=new V,Xt=new V,Zt=new V,Qt=new V,$t=new V,en=new V,tn=new V,nn=new V,rn=new V,an=new V,on=new st,sn=new st,cn=new st,ln=class e{constructor(e=new V,t=new V,n=new V){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,r){r.subVectors(n,t),Yt.subVectors(e,t),r.cross(Yt);let i=r.lengthSq();return i>0?r.multiplyScalar(1/Math.sqrt(i)):r.set(0,0,0)}static getBarycoord(e,t,n,r,i){Yt.subVectors(r,t),Xt.subVectors(n,t),Zt.subVectors(e,t);let a=Yt.dot(Yt),o=Yt.dot(Xt),s=Yt.dot(Zt),c=Xt.dot(Xt),l=Xt.dot(Zt),u=a*c-o*o;if(u===0)return i.set(0,0,0),null;let d=1/u,f=(c*s-o*l)*d,p=(a*l-o*s)*d;return i.set(1-f-p,p,f)}static containsPoint(e,t,n,r){return this.getBarycoord(e,t,n,r,Qt)!==null&&Qt.x>=0&&Qt.y>=0&&Qt.x+Qt.y<=1}static getInterpolation(e,t,n,r,i,a,o,s){return this.getBarycoord(e,t,n,r,Qt)===null?(s.x=0,s.y=0,`z`in s&&(s.z=0),`w`in s&&(s.w=0),null):(s.setScalar(0),s.addScaledVector(i,Qt.x),s.addScaledVector(a,Qt.y),s.addScaledVector(o,Qt.z),s)}static getInterpolatedAttribute(e,t,n,r,i,a){return on.setScalar(0),sn.setScalar(0),cn.setScalar(0),on.fromBufferAttribute(e,t),sn.fromBufferAttribute(e,n),cn.fromBufferAttribute(e,r),a.setScalar(0),a.addScaledVector(on,i.x),a.addScaledVector(sn,i.y),a.addScaledVector(cn,i.z),a}static isFrontFacing(e,t,n,r){return Yt.subVectors(n,t),Xt.subVectors(e,t),Yt.cross(Xt).dot(r)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,r){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[r]),this}setFromAttributeAndIndices(e,t,n,r){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,r),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Yt.subVectors(this.c,this.b),Xt.subVectors(this.a,this.b),Yt.cross(Xt).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return e.getNormal(this.a,this.b,this.c,t)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,n){return e.getBarycoord(t,this.a,this.b,this.c,n)}getInterpolation(t,n,r,i,a){return e.getInterpolation(t,this.a,this.b,this.c,n,r,i,a)}containsPoint(t){return e.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return e.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){let n=this.a,r=this.b,i=this.c,a,o;$t.subVectors(r,n),en.subVectors(i,n),nn.subVectors(e,n);let s=$t.dot(nn),c=en.dot(nn);if(s<=0&&c<=0)return t.copy(n);rn.subVectors(e,r);let l=$t.dot(rn),u=en.dot(rn);if(l>=0&&u<=l)return t.copy(r);let d=s*u-l*c;if(d<=0&&s>=0&&l<=0)return a=s/(s-l),t.copy(n).addScaledVector($t,a);an.subVectors(e,i);let f=$t.dot(an),p=en.dot(an);if(p>=0&&f<=p)return t.copy(i);let m=f*c-s*p;if(m<=0&&c>=0&&p<=0)return o=c/(c-p),t.copy(n).addScaledVector(en,o);let h=l*p-f*u;if(h<=0&&u-l>=0&&f-p>=0)return tn.subVectors(i,r),o=(u-l)/(u-l+(f-p)),t.copy(r).addScaledVector(tn,o);let g=1/(h+m+d);return a=m*g,o=d*g,t.copy(n).addScaledVector($t,a).addScaledVector(en,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}},un=class{constructor(e=new V(1/0,1/0,1/0),t=new V(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(fn.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(fn.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){let n=fn.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);let n=e.geometry;if(n!==void 0){let r=n.getAttribute(`position`);if(t===!0&&r!==void 0&&e.isInstancedMesh!==!0)for(let t=0,n=r.count;t<n;t++)e.isMesh===!0?e.getVertexPosition(t,fn):fn.fromBufferAttribute(r,t),fn.applyMatrix4(e.matrixWorld),this.expandByPoint(fn);else e.boundingBox===void 0?(n.boundingBox===null&&n.computeBoundingBox(),pn.copy(n.boundingBox)):(e.boundingBox===null&&e.computeBoundingBox(),pn.copy(e.boundingBox)),pn.applyMatrix4(e.matrixWorld),this.union(pn)}let r=e.children;for(let e=0,n=r.length;e<n;e++)this.expandByObject(r[e],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,fn),fn.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(bn),xn.subVectors(this.max,bn),mn.subVectors(e.a,bn),hn.subVectors(e.b,bn),gn.subVectors(e.c,bn),_n.subVectors(hn,mn),vn.subVectors(gn,hn),yn.subVectors(mn,gn);let t=[0,-_n.z,_n.y,0,-vn.z,vn.y,0,-yn.z,yn.y,_n.z,0,-_n.x,vn.z,0,-vn.x,yn.z,0,-yn.x,-_n.y,_n.x,0,-vn.y,vn.x,0,-yn.y,yn.x,0];return!wn(t,mn,hn,gn,xn)||(t=[1,0,0,0,1,0,0,0,1],!wn(t,mn,hn,gn,xn))?!1:(Sn.crossVectors(_n,vn),t=[Sn.x,Sn.y,Sn.z],wn(t,mn,hn,gn,xn))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,fn).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(fn).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(dn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),dn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),dn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),dn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),dn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),dn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),dn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),dn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(dn),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}},dn=[new V,new V,new V,new V,new V,new V,new V,new V],fn=new V,pn=new un,mn=new V,hn=new V,gn=new V,_n=new V,vn=new V,yn=new V,bn=new V,xn=new V,Sn=new V,Cn=new V;function wn(e,t,n,r,i){for(let a=0,o=e.length-3;a<=o;a+=3){Cn.fromArray(e,a);let o=i.x*Math.abs(Cn.x)+i.y*Math.abs(Cn.y)+i.z*Math.abs(Cn.z),s=t.dot(Cn),c=n.dot(Cn),l=r.dot(Cn);if(Math.max(-Math.max(s,c,l),Math.min(s,c,l))>o)return!1}return!0}var Tn=new V,En=new z,Dn=0,On=class extends ve{constructor(e,t,n=!1){if(super(),Array.isArray(e))throw TypeError(`THREE.BufferAttribute: array should be a Typed Array.`);this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:Dn++}),this.name=``,this.array=e,this.itemSize=t,this.count=e===void 0?0:e.length/t,this.normalized=n,this.usage=ie,this.updateRanges=[],this.gpuType=f,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let r=0,i=this.itemSize;r<i;r++)this.array[e+r]=t.array[n+r];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)En.fromBufferAttribute(this,t),En.applyMatrix3(e),this.setXY(t,En.x,En.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)Tn.fromBufferAttribute(this,t),Tn.applyMatrix3(e),this.setXYZ(t,Tn.x,Tn.y,Tn.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)Tn.fromBufferAttribute(this,t),Tn.applyMatrix4(e),this.setXYZ(t,Tn.x,Tn.y,Tn.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)Tn.fromBufferAttribute(this,t),Tn.applyNormalMatrix(e),this.setXYZ(t,Tn.x,Tn.y,Tn.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)Tn.fromBufferAttribute(this,t),Tn.transformDirection(e),this.setXYZ(t,Tn.x,Tn.y,Tn.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=Ve(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=R(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=Ve(t,this.array)),t}setX(e,t){return this.normalized&&(t=R(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=Ve(t,this.array)),t}setY(e,t){return this.normalized&&(t=R(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=Ve(t,this.array)),t}setZ(e,t){return this.normalized&&(t=R(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=Ve(t,this.array)),t}setW(e,t){return this.normalized&&(t=R(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=R(t,this.array),n=R(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,r){return e*=this.itemSize,this.normalized&&(t=R(t,this.array),n=R(n,this.array),r=R(r,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=r,this}setXYZW(e,t,n,r,i){return e*=this.itemSize,this.normalized&&(t=R(t,this.array),n=R(n,this.array),r=R(r,this.array),i=R(i,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=r,this.array[e+3]=i,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return e.name=this.name,e.usage=this.usage,e.gpuType=this.gpuType,e}dispose(){this.dispatchEvent({type:`dispose`})}},kn=class extends On{constructor(e,t,n){super(new Uint16Array(e),t,n)}},An=class extends On{constructor(e,t,n){super(new Uint32Array(e),t,n)}},W=class extends On{constructor(e,t,n){super(new Float32Array(e),t,n)}},jn=new un,Mn=new V,Nn=new V,Pn=class{constructor(e=new V,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){let n=this.center;t===void 0?jn.setFromPoints(e).getCenter(n):n.copy(t);let r=0;for(let t=0,i=e.length;t<i;t++)r=Math.max(r,n.distanceToSquared(e[t]));return this.radius=Math.sqrt(r),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){let t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){let n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius*=e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Mn.subVectors(e,this.center);let t=Mn.lengthSq();if(t>this.radius*this.radius){let e=Math.sqrt(t),n=(e-this.radius)*.5;this.center.addScaledVector(Mn,n/e),this.radius+=n}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(Nn.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Mn.copy(e.center).add(Nn)),this.expandByPoint(Mn.copy(e.center).sub(Nn))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}},Fn=0,In=new ft,Ln=new zt,Rn=new V,zn=new un,Bn=new un,Vn=new V,Hn=class e extends ve{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Fn++}),this.uuid=Ce(),this.name=``,this.type=`BufferGeometry`,this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(e){return this.index=Array.isArray(e)?new(se(e)?An:kn)(e,1):e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){let t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);let n=this.attributes.normal;if(n!==void 0){let t=new Ge().getNormalMatrix(e);n.applyNormalMatrix(t),n.needsUpdate=!0}let r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(e),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(e){return In.makeRotationFromQuaternion(e),this.applyMatrix4(In),this}rotateX(e){return In.makeRotationX(e),this.applyMatrix4(In),this}rotateY(e){return In.makeRotationY(e),this.applyMatrix4(In),this}rotateZ(e){return In.makeRotationZ(e),this.applyMatrix4(In),this}translate(e,t,n){return In.makeTranslation(e,t,n),this.applyMatrix4(In),this}scale(e,t,n){return In.makeScale(e,t,n),this.applyMatrix4(In),this}lookAt(e){return Ln.lookAt(e),Ln.updateMatrix(),this.applyMatrix4(Ln.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Rn).negate(),this.translate(Rn.x,Rn.y,Rn.z),this}setFromPoints(e){let t=this.getAttribute(`position`);if(t===void 0){let t=[];for(let n=0,r=e.length;n<r;n++){let r=e[n];t.push(r.x,r.y,r.z||0)}this.setAttribute(`position`,new W(t,3))}else{let n=Math.min(e.length,t.count);for(let r=0;r<n;r++){let n=e[r];t.setXYZ(r,n.x,n.y,n.z||0)}e.length>t.count&&F(`BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry.`),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new un);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){me(`BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.`,this),this.boundingBox.set(new V(-1/0,-1/0,-1/0),new V(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let e=0,n=t.length;e<n;e++){let n=t[e];zn.setFromBufferAttribute(n),this.morphTargetsRelative?(Vn.addVectors(this.boundingBox.min,zn.min),this.boundingBox.expandByPoint(Vn),Vn.addVectors(this.boundingBox.max,zn.max),this.boundingBox.expandByPoint(Vn)):(this.boundingBox.expandByPoint(zn.min),this.boundingBox.expandByPoint(zn.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&me(`BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.`,this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Pn);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){me(`BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.`,this),this.boundingSphere.set(new V,1/0);return}if(e){let n=this.boundingSphere.center;if(zn.setFromBufferAttribute(e),t)for(let e=0,n=t.length;e<n;e++){let n=t[e];Bn.setFromBufferAttribute(n),this.morphTargetsRelative?(Vn.addVectors(zn.min,Bn.min),zn.expandByPoint(Vn),Vn.addVectors(zn.max,Bn.max),zn.expandByPoint(Vn)):(zn.expandByPoint(Bn.min),zn.expandByPoint(Bn.max))}zn.getCenter(n);let r=0;for(let t=0,i=e.count;t<i;t++)Vn.fromBufferAttribute(e,t),r=Math.max(r,n.distanceToSquared(Vn));if(t)for(let i=0,a=t.length;i<a;i++){let a=t[i],o=this.morphTargetsRelative;for(let t=0,i=a.count;t<i;t++)Vn.fromBufferAttribute(a,t),o&&(Rn.fromBufferAttribute(e,t),Vn.add(Rn)),r=Math.max(r,n.distanceToSquared(Vn))}this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&me(`BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.`,this)}}computeTangents(){let e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){me(`BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)`);return}let n=t.position,r=t.normal,i=t.uv,a=this.getAttribute(`tangent`);(a===void 0||a.count!==n.count)&&(a=new On(new Float32Array(4*n.count),4),this.setAttribute(`tangent`,a));let o=[],s=[];for(let e=0;e<n.count;e++)o[e]=new V,s[e]=new V;let c=new V,l=new V,u=new V,d=new z,f=new z,p=new z,m=new V,h=new V;function g(e,t,r){c.fromBufferAttribute(n,e),l.fromBufferAttribute(n,t),u.fromBufferAttribute(n,r),d.fromBufferAttribute(i,e),f.fromBufferAttribute(i,t),p.fromBufferAttribute(i,r),l.sub(c),u.sub(c),f.sub(d),p.sub(d);let a=1/(f.x*p.y-p.x*f.y);isFinite(a)&&(m.copy(l).multiplyScalar(p.y).addScaledVector(u,-f.y).multiplyScalar(a),h.copy(u).multiplyScalar(f.x).addScaledVector(l,-p.x).multiplyScalar(a),o[e].add(m),o[t].add(m),o[r].add(m),s[e].add(h),s[t].add(h),s[r].add(h))}let _=this.groups;_.length===0&&(_=[{start:0,count:e.count}]);for(let t=0,n=_.length;t<n;++t){let n=_[t],r=n.start,i=n.count;for(let t=r,n=r+i;t<n;t+=3)g(e.getX(t+0),e.getX(t+1),e.getX(t+2))}let v=new V,y=new V,b=new V,x=new V;function S(e){b.fromBufferAttribute(r,e),x.copy(b);let t=o[e];v.copy(t),v.sub(b.multiplyScalar(b.dot(t))).normalize(),y.crossVectors(x,t);let n=y.dot(s[e])<0?-1:1;a.setXYZW(e,v.x,v.y,v.z,n)}for(let t=0,n=_.length;t<n;++t){let n=_[t],r=n.start,i=n.count;for(let t=r,n=r+i;t<n;t+=3)S(e.getX(t+0)),S(e.getX(t+1)),S(e.getX(t+2))}this._transformed=!0}computeVertexNormals(){let e=this.index,t=this.getAttribute(`position`);if(t!==void 0){let n=this.getAttribute(`normal`);if(n===void 0||n.count!==t.count)n=new On(new Float32Array(t.count*3),3),this.setAttribute(`normal`,n);else for(let e=0,t=n.count;e<t;e++)n.setXYZ(e,0,0,0);let r=new V,i=new V,a=new V,o=new V,s=new V,c=new V,l=new V,u=new V;if(e)for(let d=0,f=e.count;d<f;d+=3){let f=e.getX(d+0),p=e.getX(d+1),m=e.getX(d+2);r.fromBufferAttribute(t,f),i.fromBufferAttribute(t,p),a.fromBufferAttribute(t,m),l.subVectors(a,i),u.subVectors(r,i),l.cross(u),o.fromBufferAttribute(n,f),s.fromBufferAttribute(n,p),c.fromBufferAttribute(n,m),o.add(l),s.add(l),c.add(l),n.setXYZ(f,o.x,o.y,o.z),n.setXYZ(p,s.x,s.y,s.z),n.setXYZ(m,c.x,c.y,c.z)}else for(let e=0,o=t.count;e<o;e+=3)r.fromBufferAttribute(t,e+0),i.fromBufferAttribute(t,e+1),a.fromBufferAttribute(t,e+2),l.subVectors(a,i),u.subVectors(r,i),l.cross(u),n.setXYZ(e+0,l.x,l.y,l.z),n.setXYZ(e+1,l.x,l.y,l.z),n.setXYZ(e+2,l.x,l.y,l.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){let e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)Vn.fromBufferAttribute(e,t),Vn.normalize(),e.setXYZ(t,Vn.x,Vn.y,Vn.z)}toNonIndexed(){function t(e,t){let n=e.array,r=e.itemSize,i=e.normalized,a=new n.constructor(t.length*r),o=0,s=0;for(let i=0,c=t.length;i<c;i++){o=e.isInterleavedBufferAttribute?t[i]*e.data.stride+e.offset:t[i]*r;for(let e=0;e<r;e++)a[s++]=n[o++]}return new On(a,r,i)}if(this.index===null)return F(`BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed.`),this;let n=new e,r=this.index.array,i=this.attributes;for(let e in i){let a=i[e],o=t(a,r);n.setAttribute(e,o)}let a=this.morphAttributes;for(let e in a){let i=[],o=a[e];for(let e=0,n=o.length;e<n;e++){let n=o[e],a=t(n,r);i.push(a)}n.morphAttributes[e]=i}n.morphTargetsRelative=this.morphTargetsRelative;let o=this.groups;for(let e=0,t=o.length;e<t;e++){let t=o[e];n.addGroup(t.start,t.count,t.materialIndex)}return n}toJSON(){let e={metadata:{version:4.7,type:`BufferGeometry`,generator:`BufferGeometry.toJSON`}};if(e.uuid=this.uuid,e.type=this.parameters!==void 0&&this._transformed===!0?`BufferGeometry`:this.type,e.name=this.name,Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){let t=this.parameters;for(let n in t)t[n]!==void 0&&(e[n]=t[n]);return e}e.data={attributes:{}};let t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});let n=this.attributes;for(let t in n){let r=n[t];e.data.attributes[t]=r.toJSON(e.data)}let r={},i=!1;for(let t in this.morphAttributes){let n=this.morphAttributes[t],a=[];for(let t=0,r=n.length;t<r;t++){let r=n[t];a.push(r.toJSON(e.data))}a.length>0&&(r[t]=a,i=!0)}i&&(e.data.morphAttributes=r,e.data.morphTargetsRelative=this.morphTargetsRelative);let a=this.groups;a.length>0&&(e.data.groups=JSON.parse(JSON.stringify(a)));let o=this.boundingSphere;return o!==null&&(e.data.boundingSphere=o.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let t={};this.name=e.name;let n=e.index;n!==null&&this.setIndex(n.clone());let r=e.attributes;for(let e in r){let n=r[e];this.setAttribute(e,n.clone(t))}let i=e.morphAttributes;for(let e in i){let n=[],r=i[e];for(let e=0,i=r.length;e<i;e++)n.push(r[e].clone(t));this.morphAttributes[e]=n}this.morphTargetsRelative=e.morphTargetsRelative;let a=e.groups;for(let e=0,t=a.length;e<t;e++){let t=a[e];this.addGroup(t.start,t.count,t.materialIndex)}let o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());let s=e.boundingSphere;return s!==null&&(this.boundingSphere=s.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this._transformed=e._transformed,this}dispose(){this.dispatchEvent({type:`dispose`})}},Un=class{constructor(e,t){this.isInterleavedBuffer=!0,this.array=e,this.stride=t,this.count=e===void 0?0:e.length/t,this.usage=ie,this.updateRanges=[],this.version=0,this.uuid=Ce()}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.array=new e.array.constructor(e.array),this.count=e.count,this.stride=e.stride,this.usage=e.usage,this}copyAt(e,t,n){e*=this.stride,n*=t.stride;for(let r=0,i=this.stride;r<i;r++)this.array[e+r]=t.array[n+r];return this}set(e,t=0){return this.array.set(e,t),this}clone(e){e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Ce()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);let t=new this.array.constructor(e.arrayBuffers[this.array.buffer._uuid]),n=new this.constructor(t,this.stride);return n.setUsage(this.usage),n}onUpload(e){return this.onUploadCallback=e,this}toJSON(e){e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Ce()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer)));let t={uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride};return t.usage=this.usage,t}},Wn=new V,Gn=class e{constructor(e,t,n,r=!1){this.isInterleavedBufferAttribute=!0,this.name=``,this.data=e,this.itemSize=t,this.offset=n,this.normalized=r}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(e){this.data.needsUpdate=e}applyMatrix4(e){for(let t=0,n=this.data.count;t<n;t++)Wn.fromBufferAttribute(this,t),Wn.applyMatrix4(e),this.setXYZ(t,Wn.x,Wn.y,Wn.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)Wn.fromBufferAttribute(this,t),Wn.applyNormalMatrix(e),this.setXYZ(t,Wn.x,Wn.y,Wn.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)Wn.fromBufferAttribute(this,t),Wn.transformDirection(e),this.setXYZ(t,Wn.x,Wn.y,Wn.z);return this}getComponent(e,t){let n=this.array[e*this.data.stride+this.offset+t];return this.normalized&&(n=Ve(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=R(n,this.array)),this.data.array[e*this.data.stride+this.offset+t]=n,this}setX(e,t){return this.normalized&&(t=R(t,this.array)),this.data.array[e*this.data.stride+this.offset]=t,this}setY(e,t){return this.normalized&&(t=R(t,this.array)),this.data.array[e*this.data.stride+this.offset+1]=t,this}setZ(e,t){return this.normalized&&(t=R(t,this.array)),this.data.array[e*this.data.stride+this.offset+2]=t,this}setW(e,t){return this.normalized&&(t=R(t,this.array)),this.data.array[e*this.data.stride+this.offset+3]=t,this}getX(e){let t=this.data.array[e*this.data.stride+this.offset];return this.normalized&&(t=Ve(t,this.array)),t}getY(e){let t=this.data.array[e*this.data.stride+this.offset+1];return this.normalized&&(t=Ve(t,this.array)),t}getZ(e){let t=this.data.array[e*this.data.stride+this.offset+2];return this.normalized&&(t=Ve(t,this.array)),t}getW(e){let t=this.data.array[e*this.data.stride+this.offset+3];return this.normalized&&(t=Ve(t,this.array)),t}setXY(e,t,n){return e=e*this.data.stride+this.offset,this.normalized&&(t=R(t,this.array),n=R(n,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this}setXYZ(e,t,n,r){return e=e*this.data.stride+this.offset,this.normalized&&(t=R(t,this.array),n=R(n,this.array),r=R(r,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=r,this}setXYZW(e,t,n,r,i){return e=e*this.data.stride+this.offset,this.normalized&&(t=R(t,this.array),n=R(n,this.array),r=R(r,this.array),i=R(i,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=r,this.data.array[e+3]=i,this}clone(t){if(t===void 0){fe(`InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.`);let e=[];for(let t=0;t<this.count;t++){let n=t*this.data.stride+this.offset;for(let t=0;t<this.itemSize;t++)e.push(this.data.array[n+t])}return new On(new this.array.constructor(e),this.itemSize,this.normalized)}return t.interleavedBuffers===void 0&&(t.interleavedBuffers={}),t.interleavedBuffers[this.data.uuid]===void 0&&(t.interleavedBuffers[this.data.uuid]=this.data.clone(t)),new e(t.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(e){if(e===void 0){fe(`InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.`);let e=[];for(let t=0;t<this.count;t++){let n=t*this.data.stride+this.offset;for(let t=0;t<this.itemSize;t++)e.push(this.data.array[n+t])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:e,normalized:this.normalized}}return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.toJSON(e)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}},Kn=new V,qn=new V,Jn=new Ge,Yn=class{constructor(e=new V(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,r){return this.normal.set(e,t,n),this.constant=r,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){let r=Kn.subVectors(n,t).cross(qn.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(r,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){let e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t,n=!0){let r=e.delta(Kn),i=this.normal.dot(r);if(i===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;let a=-(e.start.dot(this.normal)+this.constant)/i;return n===!0&&(a<0||a>1)?null:t.copy(e.start).addScaledVector(r,a)}intersectsLine(e){let t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){let n=t||Jn.getNormalMatrix(e),r=this.coplanarPoint(Kn).applyMatrix4(e),i=this.normal.applyMatrix3(n).normalize();return this.constant=-r.dot(i),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}toJSON(){return{normal:this.normal.toArray(),constant:this.constant}}fromJSON(e){return this.normal.fromArray(e.normal),this.constant=e.constant,this}},Xn=0,Zn=class extends ve{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Xn++}),this.uuid=Ce(),this.name=``,this.type=`Material`,this.blending=1,this.side=0,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=204,this.blendDst=205,this.blendEquation=100,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new U(0,0,0),this.blendAlpha=0,this.depthFunc=3,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=519,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=re,this.stencilZFail=re,this.stencilZPass=re,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(let t in e){let n=e[t];if(n===void 0){F(`Material: parameter '${t}' has value of undefined.`);continue}let r=this[t];if(r===void 0){F(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}r&&r.isColor?r.set(n):r&&r.isVector2&&n&&n.isVector2||r&&r.isEuler&&n&&n.isEuler||r&&r.isVector3&&n&&n.isVector3?r.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e==`string`;t&&(e={textures:{},images:{}});let n={metadata:{version:4.7,type:`Material`,generator:`Material.toJSON`}};n.uuid=this.uuid,n.type=this.type,n.blending=this.blending,n.side=this.side,n.shadowSide=this.shadowSide,n.vertexColors=this.vertexColors,n.opacity=this.opacity,n.transparent=this.transparent,n.blendSrc=this.blendSrc,n.blendDst=this.blendDst,n.blendEquation=this.blendEquation,n.blendSrcAlpha=this.blendSrcAlpha,n.blendDstAlpha=this.blendDstAlpha,n.blendEquationAlpha=this.blendEquationAlpha,n.blendColor=this.blendColor.getHex(),n.blendAlpha=this.blendAlpha,n.depthFunc=this.depthFunc,n.depthTest=this.depthTest,n.depthWrite=this.depthWrite,n.colorWrite=this.colorWrite,n.clipIntersection=this.clipIntersection,n.clipShadows=this.clipShadows,n.stencilWriteMask=this.stencilWriteMask,n.stencilFunc=this.stencilFunc,n.stencilRef=this.stencilRef,n.stencilFuncMask=this.stencilFuncMask,n.stencilFail=this.stencilFail,n.stencilZFail=this.stencilZFail,n.stencilZPass=this.stencilZPass,n.stencilWrite=this.stencilWrite,n.polygonOffset=this.polygonOffset,n.polygonOffsetFactor=this.polygonOffsetFactor,n.polygonOffsetUnits=this.polygonOffsetUnits,n.dithering=this.dithering,n.alphaTest=this.alphaTest,n.alphaHash=this.alphaHash,n.alphaToCoverage=this.alphaToCoverage,n.premultipliedAlpha=this.premultipliedAlpha,n.forceSinglePass=this.forceSinglePass,n.allowOverride=this.allowOverride,n.visible=this.visible,n.toneMapped=this.toneMapped,n.name=this.name,this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.retroreflectivity!==void 0&&(n.retroreflectivity=this.retroreflectivity),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),Array.isArray(this.clippingPlanes)&&this.clippingPlanes.length>0&&(n.clippingPlanes=this.clippingPlanes.map(e=>e.toJSON())),this.rotation!==void 0&&(n.rotation=this.rotation),this.depthPacking!==void 0&&(n.depthPacking=this.depthPacking),this.linewidth!==void 0&&(n.linewidth=this.linewidth),this.linecap!==void 0&&(n.linecap=this.linecap),this.linejoin!==void 0&&(n.linejoin=this.linejoin),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.wireframe!==void 0&&(n.wireframe=this.wireframe),this.wireframeLinewidth!==void 0&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!==void 0&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!==void 0&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading!==void 0&&(n.flatShading=this.flatShading),this.fog!==void 0&&(n.fog=this.fog),Object.keys(this.userData).length>0&&(n.userData=this.userData);function r(e){let t=[];for(let n in e){let r=e[n];delete r.metadata,t.push(r)}return t}if(t){let t=r(e.textures),i=r(e.images);t.length>0&&(n.textures=t),i.length>0&&(n.images=i)}return n}fromJSON(e,t){if(e.uuid!==void 0&&(this.uuid=e.uuid),e.name!==void 0&&(this.name=e.name),e.color!==void 0&&this.color!==void 0&&this.color.setHex(e.color),e.roughness!==void 0&&(this.roughness=e.roughness),e.metalness!==void 0&&(this.metalness=e.metalness),e.sheen!==void 0&&(this.sheen=e.sheen),e.sheenColor!==void 0&&(this.sheenColor=new U().setHex(e.sheenColor)),e.sheenRoughness!==void 0&&(this.sheenRoughness=e.sheenRoughness),e.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(e.emissive),e.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(e.specular),e.specularIntensity!==void 0&&(this.specularIntensity=e.specularIntensity),e.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(e.specularColor),e.shininess!==void 0&&(this.shininess=e.shininess),e.clearcoat!==void 0&&(this.clearcoat=e.clearcoat),e.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=e.clearcoatRoughness),e.dispersion!==void 0&&(this.dispersion=e.dispersion),e.retroreflectivity!==void 0&&(this.retroreflectivity=e.retroreflectivity),e.iridescence!==void 0&&(this.iridescence=e.iridescence),e.iridescenceIOR!==void 0&&(this.iridescenceIOR=e.iridescenceIOR),e.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=e.iridescenceThicknessRange),e.transmission!==void 0&&(this.transmission=e.transmission),e.thickness!==void 0&&(this.thickness=e.thickness),e.attenuationDistance!==void 0&&(this.attenuationDistance=e.attenuationDistance),e.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(e.attenuationColor),e.anisotropy!==void 0&&(this.anisotropy=e.anisotropy),e.anisotropyRotation!==void 0&&(this.anisotropyRotation=e.anisotropyRotation),e.fog!==void 0&&(this.fog=e.fog),e.flatShading!==void 0&&(this.flatShading=e.flatShading),e.blending!==void 0&&(this.blending=e.blending),e.combine!==void 0&&(this.combine=e.combine),e.side!==void 0&&(this.side=e.side),e.shadowSide!==void 0&&(this.shadowSide=e.shadowSide),e.opacity!==void 0&&(this.opacity=e.opacity),e.transparent!==void 0&&(this.transparent=e.transparent),e.alphaTest!==void 0&&(this.alphaTest=e.alphaTest),e.alphaHash!==void 0&&(this.alphaHash=e.alphaHash),e.depthFunc!==void 0&&(this.depthFunc=e.depthFunc),e.depthTest!==void 0&&(this.depthTest=e.depthTest),e.depthWrite!==void 0&&(this.depthWrite=e.depthWrite),e.colorWrite!==void 0&&(this.colorWrite=e.colorWrite),e.clippingPlanes!==void 0&&(this.clippingPlanes=e.clippingPlanes.map(e=>new Yn().fromJSON(e))),e.clipIntersection!==void 0&&(this.clipIntersection=e.clipIntersection),e.clipShadows!==void 0&&(this.clipShadows=e.clipShadows),e.depthPacking!==void 0&&(this.depthPacking=e.depthPacking),e.blendSrc!==void 0&&(this.blendSrc=e.blendSrc),e.blendDst!==void 0&&(this.blendDst=e.blendDst),e.blendEquation!==void 0&&(this.blendEquation=e.blendEquation),e.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=e.blendSrcAlpha),e.blendDstAlpha!==void 0&&(this.blendDstAlpha=e.blendDstAlpha),e.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=e.blendEquationAlpha),e.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(e.blendColor),e.blendAlpha!==void 0&&(this.blendAlpha=e.blendAlpha),e.stencilWriteMask!==void 0&&(this.stencilWriteMask=e.stencilWriteMask),e.stencilFunc!==void 0&&(this.stencilFunc=e.stencilFunc),e.stencilRef!==void 0&&(this.stencilRef=e.stencilRef),e.stencilFuncMask!==void 0&&(this.stencilFuncMask=e.stencilFuncMask),e.stencilFail!==void 0&&(this.stencilFail=e.stencilFail),e.stencilZFail!==void 0&&(this.stencilZFail=e.stencilZFail),e.stencilZPass!==void 0&&(this.stencilZPass=e.stencilZPass),e.stencilWrite!==void 0&&(this.stencilWrite=e.stencilWrite),e.wireframe!==void 0&&(this.wireframe=e.wireframe),e.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=e.wireframeLinewidth),e.wireframeLinecap!==void 0&&(this.wireframeLinecap=e.wireframeLinecap),e.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=e.wireframeLinejoin),e.rotation!==void 0&&(this.rotation=e.rotation),e.linewidth!==void 0&&(this.linewidth=e.linewidth),e.linecap!==void 0&&(this.linecap=e.linecap),e.linejoin!==void 0&&(this.linejoin=e.linejoin),e.dashSize!==void 0&&(this.dashSize=e.dashSize),e.gapSize!==void 0&&(this.gapSize=e.gapSize),e.scale!==void 0&&(this.scale=e.scale),e.polygonOffset!==void 0&&(this.polygonOffset=e.polygonOffset),e.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=e.polygonOffsetFactor),e.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=e.polygonOffsetUnits),e.dithering!==void 0&&(this.dithering=e.dithering),e.alphaToCoverage!==void 0&&(this.alphaToCoverage=e.alphaToCoverage),e.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=e.premultipliedAlpha),e.forceSinglePass!==void 0&&(this.forceSinglePass=e.forceSinglePass),e.allowOverride!==void 0&&(this.allowOverride=e.allowOverride),e.visible!==void 0&&(this.visible=e.visible),e.toneMapped!==void 0&&(this.toneMapped=e.toneMapped),e.userData!==void 0&&(this.userData=e.userData),e.vertexColors!==void 0&&(this.vertexColors=typeof e.vertexColors==`number`?e.vertexColors>0:e.vertexColors),e.size!==void 0&&(this.size=e.size),e.sizeAttenuation!==void 0&&(this.sizeAttenuation=e.sizeAttenuation),e.map!==void 0&&(this.map=t[e.map]||null),e.matcap!==void 0&&(this.matcap=t[e.matcap]||null),e.alphaMap!==void 0&&(this.alphaMap=t[e.alphaMap]||null),e.bumpMap!==void 0&&(this.bumpMap=t[e.bumpMap]||null),e.bumpScale!==void 0&&(this.bumpScale=e.bumpScale),e.normalMap!==void 0&&(this.normalMap=t[e.normalMap]||null),e.normalMapType!==void 0&&(this.normalMapType=e.normalMapType),e.normalScale!==void 0){let t=e.normalScale;Array.isArray(t)===!1&&(t=[t,t]),this.normalScale=new z().fromArray(t)}return e.displacementMap!==void 0&&(this.displacementMap=t[e.displacementMap]||null),e.displacementScale!==void 0&&(this.displacementScale=e.displacementScale),e.displacementBias!==void 0&&(this.displacementBias=e.displacementBias),e.roughnessMap!==void 0&&(this.roughnessMap=t[e.roughnessMap]||null),e.metalnessMap!==void 0&&(this.metalnessMap=t[e.metalnessMap]||null),e.emissiveMap!==void 0&&(this.emissiveMap=t[e.emissiveMap]||null),e.emissiveIntensity!==void 0&&(this.emissiveIntensity=e.emissiveIntensity),e.specularMap!==void 0&&(this.specularMap=t[e.specularMap]||null),e.specularIntensityMap!==void 0&&(this.specularIntensityMap=t[e.specularIntensityMap]||null),e.specularColorMap!==void 0&&(this.specularColorMap=t[e.specularColorMap]||null),e.envMap!==void 0&&(this.envMap=t[e.envMap]||null),e.envMapRotation!==void 0&&this.envMapRotation.fromArray(e.envMapRotation),e.envMapIntensity!==void 0&&(this.envMapIntensity=e.envMapIntensity),e.reflectivity!==void 0&&(this.reflectivity=e.reflectivity),e.refractionRatio!==void 0&&(this.refractionRatio=e.refractionRatio),e.lightMap!==void 0&&(this.lightMap=t[e.lightMap]||null),e.lightMapIntensity!==void 0&&(this.lightMapIntensity=e.lightMapIntensity),e.aoMap!==void 0&&(this.aoMap=t[e.aoMap]||null),e.aoMapIntensity!==void 0&&(this.aoMapIntensity=e.aoMapIntensity),e.gradientMap!==void 0&&(this.gradientMap=t[e.gradientMap]||null),e.clearcoatMap!==void 0&&(this.clearcoatMap=t[e.clearcoatMap]||null),e.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=t[e.clearcoatRoughnessMap]||null),e.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=t[e.clearcoatNormalMap]||null),e.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new z().fromArray(e.clearcoatNormalScale)),e.iridescenceMap!==void 0&&(this.iridescenceMap=t[e.iridescenceMap]||null),e.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=t[e.iridescenceThicknessMap]||null),e.transmissionMap!==void 0&&(this.transmissionMap=t[e.transmissionMap]||null),e.thicknessMap!==void 0&&(this.thicknessMap=t[e.thicknessMap]||null),e.anisotropyMap!==void 0&&(this.anisotropyMap=t[e.anisotropyMap]||null),e.sheenColorMap!==void 0&&(this.sheenColorMap=t[e.sheenColorMap]||null),e.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=t[e.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;let t=e.clippingPlanes,n=null;if(t!==null){let e=t.length;n=Array(e);for(let r=0;r!==e;++r)n[r]=t[r].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:`dispose`})}set needsUpdate(e){e===!0&&this.version++}},Qn=new V,$n=new V,er=new V,tr=new V,nr=class{constructor(e=new V,t=new V(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Qn)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);let n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){let t=Qn.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Qn.copy(this.origin).addScaledVector(this.direction,t),Qn.distanceToSquared(e))}distanceSqToSegment(e,t,n,r){$n.copy(e).add(t).multiplyScalar(.5),er.copy(t).sub(e).normalize(),tr.copy(this.origin).sub($n);let i=e.distanceTo(t)*.5,a=-this.direction.dot(er),o=tr.dot(this.direction),s=-tr.dot(er),c=tr.lengthSq(),l=Math.abs(1-a*a),u,d,f,p;if(l>0){if(u=a*s-o,d=a*o-s,p=i*l,u>=0){if(d>=-p){if(d<=p){let e=1/l;u*=e,d*=e,f=u*(u+a*d+2*o)+d*(a*u+d+2*s)+c}else d=i,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*s)+c}else d=-i,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*s)+c}else d<=-p?(u=Math.max(0,-(-a*i+o)),d=u>0?-i:Math.min(Math.max(-i,-s),i),f=-u*u+d*(d+2*s)+c):d<=p?(u=0,d=Math.min(Math.max(-i,-s),i),f=d*(d+2*s)+c):(u=Math.max(0,-(a*i+o)),d=u>0?i:Math.min(Math.max(-i,-s),i),f=-u*u+d*(d+2*s)+c)}else d=a>0?-i:i,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*s)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,u),r&&r.copy($n).addScaledVector(er,d),f}intersectSphere(e,t){if(e.radius<0)return null;Qn.subVectors(e.center,this.origin);let n=Qn.dot(this.direction),r=Qn.dot(Qn)-n*n,i=e.radius*e.radius;if(r>i)return null;let a=Math.sqrt(i-r),o=n-a,s=n+a;return s<0?null:o<0?this.at(s,t):this.at(o,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){let t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;let n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){let n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){let t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,r,i,a,o,s,c=1/this.direction.x,l=1/this.direction.y,u=1/this.direction.z,d=this.origin;return c>=0?(n=(e.min.x-d.x)*c,r=(e.max.x-d.x)*c):(n=(e.max.x-d.x)*c,r=(e.min.x-d.x)*c),l>=0?(i=(e.min.y-d.y)*l,a=(e.max.y-d.y)*l):(i=(e.max.y-d.y)*l,a=(e.min.y-d.y)*l),n>a||i>r||((i>n||isNaN(n))&&(n=i),(a<r||isNaN(r))&&(r=a),u>=0?(o=(e.min.z-d.z)*u,s=(e.max.z-d.z)*u):(o=(e.max.z-d.z)*u,s=(e.min.z-d.z)*u),n>s||o>r)||((o>n||n!==n)&&(n=o),(s<r||r!==r)&&(r=s),r<0)?null:this.at(n>=0?n:r,t)}intersectsBox(e){return this.intersectBox(e,Qn)!==null}intersectTriangle(e,t,n,r,i){let a=this.origin,o=this.direction,s=o.x,c=o.y,l=o.z,u=e.x-a.x,d=e.y-a.y,f=e.z-a.z,p=t.x-a.x,m=t.y-a.y,h=t.z-a.z,g=n.x-a.x,_=n.y-a.y,v=n.z-a.z,y=Math.abs(s),b=Math.abs(c),x=Math.abs(l),S,C,w,T,E,D,O,k,A,j,M,ee;if(y>=b&&y>=x?(w=s,D=u,A=p,ee=g,s>=0?(S=c,C=l,T=d,E=f,O=m,k=h,j=_,M=v):(S=l,C=c,T=f,E=d,O=h,k=m,j=v,M=_)):b>=x?(w=c,D=d,A=m,ee=_,c>=0?(S=l,C=s,T=f,E=u,O=h,k=p,j=v,M=g):(S=s,C=l,T=u,E=f,O=p,k=h,j=g,M=v)):(w=l,D=f,A=h,ee=v,l>=0?(S=s,C=c,T=u,E=d,O=p,k=m,j=g,M=_):(S=c,C=s,T=d,E=u,O=m,k=p,j=_,M=g)),w===0)return null;let N=S/w,te=C/w,ne=1/w,P=T-N*D,re=E-te*D,ie=O-N*A,ae=k-te*A,oe=j-N*ee,se=M-te*ee,ce=oe*ae-se*ie,le=P*se-re*oe,ue=ie*re-ae*P;if(r){if(ce<0||le<0||ue<0)return null}else if((ce<0||le<0||ue<0)&&(ce>0||le>0||ue>0))return null;let de=ce+le+ue;if(de===0)return null;let fe=ne*(ce*D+le*A+ue*ee);return(de>0?fe<0:fe>0)?null:this.at(fe/de,i)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},rr=class extends Zn{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type=`MeshBasicMaterial`,this.color=new U(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new St,this.combine=0,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap=`round`,this.wireframeLinejoin=`round`,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}},ir=new ft,ar=new nr,or=new Pn,sr=new V,cr=new V,lr=new V,ur=new V,dr=new V,fr=new V,pr=new V,mr=new V,G=class extends zt{constructor(e=new Hn,t=new rr){super(),this.isMesh=!0,this.type=`Mesh`,this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){let e=this.geometry.morphAttributes,t=Object.keys(e);if(t.length>0){let n=e[t[0]];if(n!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let e=0,t=n.length;e<t;e++){let t=n[e].name||String(e);this.morphTargetInfluences.push(0),this.morphTargetDictionary[t]=e}}}}getVertexPosition(e,t){let n=this.geometry,r=n.attributes.position,i=n.morphAttributes.position,a=n.morphTargetsRelative;t.fromBufferAttribute(r,e);let o=this.morphTargetInfluences;if(i&&o){fr.set(0,0,0);for(let n=0,r=i.length;n<r;n++){let r=o[n],s=i[n];r!==0&&(dr.fromBufferAttribute(s,e),a?fr.addScaledVector(dr,r):fr.addScaledVector(dr.sub(t),r))}t.add(fr)}return t}intersectsFrustum(e){return e.intersectsObject(this)}raycast(e,t){let n=this.geometry,r=this.material,i=this.matrixWorld;r!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),or.copy(n.boundingSphere),or.applyMatrix4(i),ar.copy(e.ray).recast(e.near),!(or.containsPoint(ar.origin)===!1&&(ar.intersectSphere(or,sr)===null||ar.origin.distanceToSquared(sr)>(e.far-e.near)**2))&&(ir.copy(i).invert(),ar.copy(e.ray).applyMatrix4(ir),(n.boundingBox===null||ar.intersectsBox(n.boundingBox)!==!1)&&this._computeIntersections(e,t,ar)))}_computeIntersections(e,t,n){let r,i=this.geometry,a=this.material,o=i.index,s=i.attributes.position,c=i.attributes.uv,l=i.attributes.uv1,u=i.attributes.normal,d=i.groups,f=i.drawRange;if(o!==null){if(Array.isArray(a))for(let i=0,s=d.length;i<s;i++){let s=d[i],p=a[s.materialIndex],m=Math.max(s.start,f.start),h=Math.min(o.count,Math.min(s.start+s.count,f.start+f.count));for(let i=m,a=h;i<a;i+=3){let a=o.getX(i),d=o.getX(i+1),f=o.getX(i+2);r=gr(this,p,e,n,c,l,u,a,d,f),r&&(r.faceIndex=Math.floor(i/3),r.face.materialIndex=s.materialIndex,t.push(r))}}else{let i=Math.max(0,f.start),s=Math.min(o.count,f.start+f.count);for(let d=i,f=s;d<f;d+=3){let i=o.getX(d),s=o.getX(d+1),f=o.getX(d+2);r=gr(this,a,e,n,c,l,u,i,s,f),r&&(r.faceIndex=Math.floor(d/3),t.push(r))}}}else if(s!==void 0){if(Array.isArray(a))for(let i=0,o=d.length;i<o;i++){let o=d[i],p=a[o.materialIndex],m=Math.max(o.start,f.start),h=Math.min(s.count,Math.min(o.start+o.count,f.start+f.count));for(let i=m,a=h;i<a;i+=3){let a=i,s=i+1,d=i+2;r=gr(this,p,e,n,c,l,u,a,s,d),r&&(r.faceIndex=Math.floor(i/3),r.face.materialIndex=o.materialIndex,t.push(r))}}else{let i=Math.max(0,f.start),o=Math.min(s.count,f.start+f.count);for(let s=i,d=o;s<d;s+=3){let i=s,o=s+1,d=s+2;r=gr(this,a,e,n,c,l,u,i,o,d),r&&(r.faceIndex=Math.floor(s/3),t.push(r))}}}}};function hr(e,t,n,r,i,a,o,s){let c;if(c=t.side===1?r.intersectTriangle(o,a,i,!0,s):r.intersectTriangle(i,a,o,t.side===0,s),c===null)return null;mr.copy(s),mr.applyMatrix4(e.matrixWorld);let l=n.ray.origin.distanceTo(mr);return l<n.near||l>n.far?null:{distance:l,point:mr.clone(),object:e}}function gr(e,t,n,r,i,a,o,s,c,l){e.getVertexPosition(s,cr),e.getVertexPosition(c,lr),e.getVertexPosition(l,ur);let u=hr(e,t,n,r,cr,lr,ur,pr);if(u){let e=new V;ln.getBarycoord(pr,cr,lr,ur,e),i&&(u.uv=ln.getInterpolatedAttribute(i,s,c,l,e,new z)),a&&(u.uv1=ln.getInterpolatedAttribute(a,s,c,l,e,new z)),o&&(u.normal=ln.getInterpolatedAttribute(o,s,c,l,e,new V),u.normal.dot(r.direction)>0&&u.normal.multiplyScalar(-1));let t={a:s,b:c,c:l,normal:new V,materialIndex:0};ln.getNormal(cr,lr,ur,t.normal),u.face=t,u.barycoord=e}return u}var _r=new st,vr=new st,yr=new st,br=new st,xr=new ft,Sr=new V,Cr=new Pn,wr=new ft,Tr=new nr,Er=class extends G{constructor(e,t){super(e,t),this.isSkinnedMesh=!0,this.type=`SkinnedMesh`,this.bindMode=`attached`,this.bindMatrix=new ft,this.bindMatrixInverse=new ft,this.boundingBox=null,this.boundingSphere=null}computeBoundingBox(){let e=this.geometry;this.boundingBox===null&&(this.boundingBox=new un),this.boundingBox.makeEmpty();let t=e.getAttribute(`position`);for(let e=0;e<t.count;e++)this.getVertexPosition(e,Sr),this.boundingBox.expandByPoint(Sr)}computeBoundingSphere(){let e=this.geometry;this.boundingSphere===null&&(this.boundingSphere=new Pn),this.boundingSphere.makeEmpty();let t=e.getAttribute(`position`);for(let e=0;e<t.count;e++)this.getVertexPosition(e,Sr),this.boundingSphere.expandByPoint(Sr)}copy(e,t){return super.copy(e,t),this.bindMode=e.bindMode,this.bindMatrix.copy(e.bindMatrix),this.bindMatrixInverse.copy(e.bindMatrixInverse),this.skeleton=e.skeleton,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}raycast(e,t){let n=this.material,r=this.matrixWorld;n!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),Cr.copy(this.boundingSphere),Cr.applyMatrix4(r),e.ray.intersectsSphere(Cr)!==!1&&(wr.copy(r).invert(),Tr.copy(e.ray).applyMatrix4(wr),(this.boundingBox===null||Tr.intersectsBox(this.boundingBox)!==!1)&&this._computeIntersections(e,t,Tr)))}getVertexPosition(e,t){return super.getVertexPosition(e,t),this.applyBoneTransform(e,t),t}bind(e,t){this.skeleton=e,t===void 0&&(this.updateMatrixWorld(!0),this.skeleton.calculateInverses(),t=this.matrixWorld),this.bindMatrix.copy(t),this.bindMatrixInverse.copy(t).invert()}pose(){this.skeleton.pose()}normalizeSkinWeights(){let e=new st,t=this.geometry.attributes.skinWeight;for(let n=0,r=t.count;n<r;n++){e.fromBufferAttribute(t,n);let r=1/e.manhattanLength();r===1/0?e.set(1,0,0,0):e.multiplyScalar(r),t.setXYZW(n,e.x,e.y,e.z,e.w)}}updateMatrixWorld(e){super.updateMatrixWorld(e),this.bindMode===`attached`?this.bindMatrixInverse.copy(this.matrixWorld).invert():this.bindMode===`detached`?this.bindMatrixInverse.copy(this.bindMatrix).invert():F(`SkinnedMesh: Unrecognized bindMode: `+this.bindMode)}applyBoneTransform(e,t){let n=this.skeleton,r=this.geometry;vr.fromBufferAttribute(r.attributes.skinIndex,e),yr.fromBufferAttribute(r.attributes.skinWeight,e),t.isVector4?(_r.copy(t),t.set(0,0,0,0)):(_r.set(...t,1),t.set(0,0,0)),_r.applyMatrix4(this.bindMatrix);for(let e=0;e<4;e++){let r=yr.getComponent(e);if(r!==0){let i=vr.getComponent(e);xr.multiplyMatrices(n.bones[i].matrixWorld,n.boneInverses[i]),t.addScaledVector(br.copy(_r).applyMatrix4(xr),r)}}return t.isVector4&&(t.w=_r.w),t.applyMatrix4(this.bindMatrixInverse)}},Dr=class extends zt{constructor(){super(),this.isBone=!0,this.type=`Bone`}},Or=class extends ot{constructor(e=null,t=1,n=1,i,a,o,s,c,l=r,u=r,d,f){super(null,o,s,c,l,u,i,a,d,f),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}},kr=new ft,Ar=new ft,jr=class e{constructor(e=[],t=[]){this.uuid=Ce(),this.bones=e.slice(0),this.boneInverses=t,this.boneMatrices=null,this.boneTexture=null,this.init()}init(){let e=this.bones,t=this.boneInverses;if(this.boneMatrices=new Float32Array(e.length*16),t.length===0)this.calculateInverses();else if(e.length!==t.length){F(`Skeleton: Number of inverse bone matrices does not match amount of bones.`),this.boneInverses=[];for(let e=0,t=this.bones.length;e<t;e++)this.boneInverses.push(new ft)}}calculateInverses(){this.boneInverses.length=0;for(let e=0,t=this.bones.length;e<t;e++){let t=new ft;this.bones[e]&&t.copy(this.bones[e].matrixWorld).invert(),this.boneInverses.push(t)}}pose(){for(let e=0,t=this.bones.length;e<t;e++){let t=this.bones[e];t&&t.matrixWorld.copy(this.boneInverses[e]).invert()}for(let e=0,t=this.bones.length;e<t;e++){let t=this.bones[e];t&&(t.parent&&t.parent.isBone?(t.matrix.copy(t.parent.matrixWorld).invert(),t.matrix.multiply(t.matrixWorld)):t.matrix.copy(t.matrixWorld),t.matrix.decompose(t.position,t.quaternion,t.scale))}}update(){let e=this.bones,t=this.boneInverses,n=this.boneMatrices,r=this.boneTexture;for(let r=0,i=e.length;r<i;r++){let i=e[r]?e[r].matrixWorld:Ar;kr.multiplyMatrices(i,t[r]),kr.toArray(n,r*16)}r!==null&&(r.needsUpdate=!0)}clone(){return new e(this.bones,this.boneInverses)}computeBoneTexture(){let e=Math.sqrt(this.bones.length*4);e=Math.ceil(e/4)*4,e=Math.max(e,4);let t=new Float32Array(e*e*4);t.set(this.boneMatrices);let n=new Or(t,e,e,_,f);return n.needsUpdate=!0,this.boneMatrices=t,this.boneTexture=n,this}getBoneByName(e){for(let t=0,n=this.bones.length;t<n;t++){let n=this.bones[t];if(n.name===e)return n}}dispose(){this.boneTexture!==null&&(this.boneTexture.dispose(),this.boneTexture=null)}fromJSON(e,t){this.uuid=e.uuid;for(let n=0,r=e.bones.length;n<r;n++){let r=e.bones[n],i=t[r];i===void 0&&(F(`Skeleton: No bone found with UUID:`,r),i=new Dr),this.bones.push(i),this.boneInverses.push(new ft().fromArray(e.boneInverses[n]))}return this.init(),this}toJSON(){let e={metadata:{version:4.7,type:`Skeleton`,generator:`Skeleton.toJSON`},bones:[],boneInverses:[]};e.uuid=this.uuid;let t=this.bones,n=this.boneInverses;for(let r=0,i=t.length;r<i;r++){let i=t[r];e.bones.push(i.uuid);let a=n[r];e.boneInverses.push(a.toArray())}return e}},Mr=class extends On{constructor(e,t,n,r=1){super(e,t,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=r}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}toJSON(){let e=super.toJSON();return e.meshPerAttribute=this.meshPerAttribute,e.isInstancedBufferAttribute=!0,e}},Nr=new ft,Pr=new ft,Fr=[],Ir=new un,Lr=new ft,Rr=new G,zr=new Pn,Br=class extends G{constructor(e,t,n){super(e,t),this.isInstancedMesh=!0,this.instanceMatrix=new Mr(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let e=0;e<n;e++)this.setMatrixAt(e,Lr)}computeBoundingBox(){let e=this.geometry,t=this.count;this.boundingBox===null&&(this.boundingBox=new un),e.boundingBox===null&&e.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,Nr),Ir.copy(e.boundingBox).applyMatrix4(Nr),this.boundingBox.union(Ir)}computeBoundingSphere(){let e=this.geometry,t=this.count;this.boundingSphere===null&&(this.boundingSphere=new Pn),e.boundingSphere===null&&e.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,Nr),zr.copy(e.boundingSphere).applyMatrix4(Nr),this.boundingSphere.union(zr)}copy(e,t){return super.copy(e,t),this.instanceMatrix.copy(e.instanceMatrix),e.morphTexture!==null&&(this.morphTexture=e.morphTexture.clone()),e.instanceColor!==null&&(this.instanceColor=e.instanceColor.clone()),this.count=e.count,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}getColorAt(e,t){return this.instanceColor===null?t.setRGB(1,1,1):t.fromArray(this.instanceColor.array,e*3)}getMatrixAt(e,t){return t.fromArray(this.instanceMatrix.array,e*16)}getMorphAt(e,t){let n=t.morphTargetInfluences,r=this.morphTexture.source.data.data,i=e*(n.length+1)+1;for(let e=0;e<n.length;e++)n[e]=r[i+e]}raycast(e,t){let n=this.matrixWorld,r=this.count;if(Rr.geometry=this.geometry,Rr.material=this.material,Rr.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),zr.copy(this.boundingSphere),zr.applyMatrix4(n),e.ray.intersectsSphere(zr)!==!1))for(let i=0;i<r;i++){this.getMatrixAt(i,Nr),Pr.multiplyMatrices(n,Nr),Rr.matrixWorld=Pr,Rr.raycast(e,Fr);for(let e=0,n=Fr.length;e<n;e++){let n=Fr[e];n.instanceId=i,n.object=this,t.push(n)}Fr.length=0}}setColorAt(e,t){return this.instanceColor===null&&(this.instanceColor=new Mr(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),t.toArray(this.instanceColor.array,e*3),this}setMatrixAt(e,t){return t.toArray(this.instanceMatrix.array,e*16),this}setMorphAt(e,t){let n=t.morphTargetInfluences,r=n.length+1;this.morphTexture===null&&(this.morphTexture=new Or(new Float32Array(r*this.count),r,this.count,b,f));let i=this.morphTexture.source.data.data,a=0;for(let e=0;e<n.length;e++)a+=n[e];let o=this.geometry.morphTargetsRelative?1:1-a,s=r*e;return i[s]=o,i.set(n,s+1),this}updateMorphTargets(){}dispose(){super.dispose(),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null)}},Vr=new Pn,Hr=new z(.5,.5),Ur=new V,Wr=class{constructor(e=new Yn,t=new Yn,n=new Yn,r=new Yn,i=new Yn,a=new Yn){this.planes=[e,t,n,r,i,a]}set(e,t,n,r,i,a){let o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(n),o[3].copy(r),o[4].copy(i),o[5].copy(a),this}copy(e){let t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=oe,n=!1){let r=this.planes,i=e.elements,a=i[0],o=i[1],s=i[2],c=i[3],l=i[4],u=i[5],d=i[6],f=i[7],p=i[8],m=i[9],h=i[10],g=i[11],_=i[12],v=i[13],y=i[14],b=i[15];if(r[0].setComponents(c-a,f-l,g-p,b-_).normalize(),r[1].setComponents(c+a,f+l,g+p,b+_).normalize(),r[2].setComponents(c+o,f+u,g+m,b+v).normalize(),r[3].setComponents(c-o,f-u,g-m,b-v).normalize(),n)r[4].setComponents(s,d,h,y).normalize(),r[5].setComponents(c-s,f-d,g-h,b-y).normalize();else if(r[4].setComponents(c-s,f-d,g-h,b-y).normalize(),t===2e3)r[5].setComponents(c+s,f+d,g+h,b+y).normalize();else if(t===2001)r[5].setComponents(s,d,h,y).normalize();else throw Error(`THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: `+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Vr.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{let t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Vr.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Vr)}intersectsSprite(e){return Vr.center.set(0,0,0),Vr.radius=.7071067811865476+Hr.distanceTo(e.center),Vr.applyMatrix4(e.matrixWorld),this.intersectsSphere(Vr)}intersectsSphere(e){let t=this.planes,n=e.center,r=-e.radius;for(let e=0;e<6;e++)if(t[e].distanceToPoint(n)<r)return!1;return!0}intersectsBox(e){let t=this.planes;for(let n=0;n<6;n++){let r=t[n];if(Ur.x=r.normal.x>0?e.max.x:e.min.x,Ur.y=r.normal.y>0?e.max.y:e.min.y,Ur.z=r.normal.z>0?e.max.z:e.min.z,r.distanceToPoint(Ur)<0)return!1}return!0}containsPoint(e){let t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}},Gr=class extends Zn{constructor(e){super(),this.isLineBasicMaterial=!0,this.type=`LineBasicMaterial`,this.color=new U(16777215),this.map=null,this.linewidth=1,this.linecap=`round`,this.linejoin=`round`,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}},Kr=new V,qr=new V,Jr=new ft,Yr=new nr,Xr=new Pn,Zr=new V,Qr=new V,$r=class extends zt{constructor(e=new Hn,t=new Gr){super(),this.isLine=!0,this.type=`Line`,this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){let e=this.geometry;if(e.index===null){let t=e.attributes.position,n=[0];for(let e=1,r=t.count;e<r;e++)Kr.fromBufferAttribute(t,e-1),qr.fromBufferAttribute(t,e),n[e]=n[e-1],n[e]+=Kr.distanceTo(qr);e.setAttribute(`lineDistance`,new W(n,1))}else F(`Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.`);return this}intersectsFrustum(e){return e.intersectsObject(this)}raycast(e,t){let n=this.geometry,r=this.matrixWorld,i=e.params.Line.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Xr.copy(n.boundingSphere),Xr.applyMatrix4(r),Xr.radius+=i,e.ray.intersectsSphere(Xr)===!1)return;Jr.copy(r).invert(),Yr.copy(e.ray).applyMatrix4(Jr);let o=i/((this.scale.x+this.scale.y+this.scale.z)/3),s=o*o,c=this.isLineSegments?2:1,l=n.index,u=n.attributes.position;if(l!==null){let n=Math.max(0,a.start),r=Math.min(l.count,a.start+a.count);for(let i=n,a=r-1;i<a;i+=c){let n=l.getX(i),r=l.getX(i+1),a=ei(this,e,Yr,s,n,r,i);a&&t.push(a)}if(this.isLineLoop){let i=l.getX(r-1),a=l.getX(n),o=ei(this,e,Yr,s,i,a,r-1);o&&t.push(o)}}else{let n=Math.max(0,a.start),r=Math.min(u.count,a.start+a.count);for(let i=n,a=r-1;i<a;i+=c){let n=ei(this,e,Yr,s,i,i+1,i);n&&t.push(n)}if(this.isLineLoop){let i=ei(this,e,Yr,s,r-1,n,r-1);i&&t.push(i)}}}updateMorphTargets(){let e=this.geometry.morphAttributes,t=Object.keys(e);if(t.length>0){let n=e[t[0]];if(n!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let e=0,t=n.length;e<t;e++){let t=n[e].name||String(e);this.morphTargetInfluences.push(0),this.morphTargetDictionary[t]=e}}}}};function ei(e,t,n,r,i,a,o){let s=e.geometry.attributes.position;if(Kr.fromBufferAttribute(s,i),qr.fromBufferAttribute(s,a),n.distanceSqToSegment(Kr,qr,Zr,Qr)>r)return;Zr.applyMatrix4(e.matrixWorld);let c=t.ray.origin.distanceTo(Zr);if(!(c<t.near||c>t.far))return{distance:c,point:Qr.clone().applyMatrix4(e.matrixWorld),index:o,face:null,faceIndex:null,barycoord:null,object:e}}var ti=new V,ni=new V,ri=class extends $r{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type=`LineSegments`}computeLineDistances(){let e=this.geometry;if(e.index===null){let t=e.attributes.position,n=[];for(let e=0,r=t.count;e<r;e+=2)ti.fromBufferAttribute(t,e),ni.fromBufferAttribute(t,e+1),n[e]=e===0?0:n[e-1],n[e+1]=n[e]+ti.distanceTo(ni);e.setAttribute(`lineDistance`,new W(n,1))}else F(`LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.`);return this}},ii=class extends $r{constructor(e,t){super(e,t),this.isLineLoop=!0,this.type=`LineLoop`}},ai=class extends Zn{constructor(e){super(),this.isPointsMaterial=!0,this.type=`PointsMaterial`,this.color=new U(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}},oi=new ft,si=new nr,ci=new Pn,li=new V,ui=class extends zt{constructor(e=new Hn,t=new ai){super(),this.isPoints=!0,this.type=`Points`,this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}intersectsFrustum(e){return e.intersectsObject(this)}raycast(e,t){let n=this.geometry,r=this.matrixWorld,i=e.params.Points.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),ci.copy(n.boundingSphere),ci.applyMatrix4(r),ci.radius+=i,e.ray.intersectsSphere(ci)===!1)return;oi.copy(r).invert(),si.copy(e.ray).applyMatrix4(oi);let o=i/((this.scale.x+this.scale.y+this.scale.z)/3),s=o*o,c=n.index,l=n.attributes.position;if(c!==null){let n=Math.max(0,a.start),i=Math.min(c.count,a.start+a.count);for(let a=n,o=i;a<o;a++){let n=c.getX(a);li.fromBufferAttribute(l,n),di(li,n,s,r,e,t,this)}}else{let n=Math.max(0,a.start),i=Math.min(l.count,a.start+a.count);for(let a=n,o=i;a<o;a++)li.fromBufferAttribute(l,a),di(li,a,s,r,e,t,this)}}updateMorphTargets(){let e=this.geometry.morphAttributes,t=Object.keys(e);if(t.length>0){let n=e[t[0]];if(n!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let e=0,t=n.length;e<t;e++){let t=n[e].name||String(e);this.morphTargetInfluences.push(0),this.morphTargetDictionary[t]=e}}}}};function di(e,t,n,r,i,a,o){let s=si.distanceSqToPoint(e);if(s<n){let n=new V;si.closestPointToPoint(e,n),n.applyMatrix4(r);let c=i.ray.origin.distanceTo(n);if(c<i.near||c>i.far)return;a.push({distance:c,distanceToRay:Math.sqrt(s),point:n,index:t,face:null,faceIndex:null,barycoord:null,object:o})}}var fi=class extends ot{constructor(e=[],t=301,n,r,i,a,o,s,c,l){super(e,t,n,r,i,a,o,s,c,l),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}},pi=class extends ot{constructor(e,t,n,r,i,a,o,s,c){super(e,t,n,r,i,a,o,s,c),this.isCanvasTexture=!0,this.needsUpdate=!0}},mi=class extends ot{constructor(e,t,n=d,i,a,o,s=r,c=r,l,u=v,f=1){if(u!==1026&&u!==1027)throw Error(`THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat`);super({width:e,height:t,depth:f},i,a,o,s,c,u,n,l),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new nt(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){let t=super.toJSON(e);return t.compareFunction=this.compareFunction,t}},hi=class extends mi{constructor(e,t=d,n=301,i,a,o=r,s=r,c,l=v){let u={width:e,height:e,depth:1},f=[u,u,u,u,u,u];super(e,e,t,n,i,a,o,s,c,l),this.image=f,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}},gi=class extends ot{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}},_i=class e extends Hn{constructor(e=1,t=1,n=1,r=1,i=1,a=1){super(),this.type=`BoxGeometry`,this.parameters={width:e,height:t,depth:n,widthSegments:r,heightSegments:i,depthSegments:a};let o=this;r=Math.floor(r),i=Math.floor(i),a=Math.floor(a);let s=[],c=[],l=[],u=[],d=0,f=0;p(`z`,`y`,`x`,-1,-1,n,t,e,a,i,0),p(`z`,`y`,`x`,1,-1,n,t,-e,a,i,1),p(`x`,`z`,`y`,1,1,e,n,t,r,a,2),p(`x`,`z`,`y`,1,-1,e,n,-t,r,a,3),p(`x`,`y`,`z`,1,-1,e,t,n,r,i,4),p(`x`,`y`,`z`,-1,-1,e,t,-n,r,i,5),this.setIndex(s),this.setAttribute(`position`,new W(c,3)),this.setAttribute(`normal`,new W(l,3)),this.setAttribute(`uv`,new W(u,2));function p(e,t,n,r,i,a,p,m,h,g,_){let v=a/h,y=p/g,b=a/2,x=p/2,S=m/2,C=h+1,w=g+1,T=0,E=0,D=new V;for(let a=0;a<w;a++){let o=a*y-x;for(let s=0;s<C;s++)D[e]=(s*v-b)*r,D[t]=o*i,D[n]=S,c.push(D.x,D.y,D.z),D[e]=0,D[t]=0,D[n]=m>0?1:-1,l.push(D.x,D.y,D.z),u.push(s/h),u.push(1-a/g),T+=1}for(let e=0;e<g;e++)for(let t=0;t<h;t++){let n=d+t+C*e,r=d+t+C*(e+1),i=d+(t+1)+C*(e+1),a=d+(t+1)+C*e;s.push(n,r,a),s.push(r,i,a),E+=6}o.addGroup(f,E,_),f+=E,d+=T}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}},vi=class e extends Hn{constructor(e=1,t=1,n=4,r=8,i=1){super(),this.type=`CapsuleGeometry`,this.parameters={radius:e,height:t,capSegments:n,radialSegments:r,heightSegments:i},t=Math.max(0,t),n=Math.max(1,Math.floor(n)),r=Math.max(3,Math.floor(r)),i=Math.max(1,Math.floor(i));let a=[],o=[],s=[],c=[],l=t/2,u=Math.PI/2*e,d=t,f=2*u+d,p=n*2+i,m=r+1,h=new V,g=new V;for(let _=0;_<=p;_++){let v=0,y=0,b=0,x=0;if(_<=n){let t=_/n,r=t*Math.PI/2;y=-l-e*Math.cos(r),b=e*Math.sin(r),x=-e*Math.cos(r),v=t*u}else if(_<=n+i){let r=(_-n)/i;y=-l+r*t,b=e,x=0,v=u+r*d}else{let t=(_-n-i)/n,r=t*Math.PI/2;y=l+e*Math.sin(r),b=e*Math.cos(r),x=e*Math.sin(r),v=u+d+t*u}let S=Math.max(0,Math.min(1,v/f)),C=0;_===0?C=.5/r:_===p&&(C=-.5/r);for(let e=0;e<=r;e++){let t=e/r,n=t*Math.PI*2,i=Math.sin(n),a=Math.cos(n);g.x=-b*a,g.y=y,g.z=b*i,o.push(g.x,g.y,g.z),h.set(-b*a,x,b*i),h.normalize(),s.push(h.x,h.y,h.z),c.push(t+C,S)}if(_>0){let e=(_-1)*m;for(let t=0;t<r;t++){let n=e+t,r=e+t+1,i=_*m+t,o=_*m+t+1;a.push(n,r,i),a.push(r,o,i)}}}this.setIndex(a),this.setAttribute(`position`,new W(o,3)),this.setAttribute(`normal`,new W(s,3)),this.setAttribute(`uv`,new W(c,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.radius,t.height,t.capSegments,t.radialSegments,t.heightSegments)}},yi=class e extends Hn{constructor(e=1,t=32,n=0,r=Math.PI*2){super(),this.type=`CircleGeometry`,this.parameters={radius:e,segments:t,thetaStart:n,thetaLength:r},t=Math.max(3,t);let i=[],a=[],o=[],s=[],c=new V,l=new z;a.push(0,0,0),o.push(0,0,1),s.push(.5,.5);for(let i=0,u=3;i<=t;i++,u+=3){let d=n+i/t*r;c.x=e*Math.cos(d),c.y=e*Math.sin(d),a.push(c.x,c.y,c.z),o.push(0,0,1),l.x=(a[u]/e+1)/2,l.y=(a[u+1]/e+1)/2,s.push(l.x,l.y)}for(let e=1;e<=t;e++)i.push(e,e+1,0);this.setIndex(i),this.setAttribute(`position`,new W(a,3)),this.setAttribute(`normal`,new W(o,3)),this.setAttribute(`uv`,new W(s,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.radius,t.segments,t.thetaStart,t.thetaLength)}},bi=class e extends Hn{constructor(e=1,t=1,n=1,r=32,i=1,a=!1,o=0,s=Math.PI*2){super(),this.type=`CylinderGeometry`,this.parameters={radiusTop:e,radiusBottom:t,height:n,radialSegments:r,heightSegments:i,openEnded:a,thetaStart:o,thetaLength:s};let c=this;r=Math.floor(r),i=Math.floor(i);let l=[],u=[],d=[],f=[],p=0,m=[],h=n/2,g=0;_(),a===!1&&(e>0&&v(!0),t>0&&v(!1)),this.setIndex(l),this.setAttribute(`position`,new W(u,3)),this.setAttribute(`normal`,new W(d,3)),this.setAttribute(`uv`,new W(f,2));function _(){let a=new V,_=new V,v=0,y=(t-e)/n;for(let c=0;c<=i;c++){let l=[],g=c/i,v=g*(t-e)+e;for(let e=0;e<=r;e++){let t=e/r,i=t*s+o,c=Math.sin(i),m=Math.cos(i);_.x=v*c,_.y=-g*n+h,_.z=v*m,u.push(_.x,_.y,_.z),a.set(c,y,m).normalize(),d.push(a.x,a.y,a.z),f.push(t,1-g),l.push(p++)}m.push(l)}for(let n=0;n<r;n++)for(let r=0;r<i;r++){let a=m[r][n],o=m[r+1][n],s=m[r+1][n+1],c=m[r][n+1];(e>0||r!==0)&&(l.push(a,o,c),v+=3),(t>0||r!==i-1)&&(l.push(o,s,c),v+=3)}c.addGroup(g,v,0),g+=v}function v(n){let i=p,a=new z,m=new V,_=0,v=n===!0?e:t,y=n===!0?1:-1;for(let e=1;e<=r;e++)u.push(0,h*y,0),d.push(0,y,0),f.push(.5,.5),p++;let b=p;for(let e=0;e<=r;e++){let t=e/r*s+o,n=Math.cos(t),i=Math.sin(t);m.x=v*i,m.y=h*y,m.z=v*n,u.push(m.x,m.y,m.z),d.push(0,y,0),a.x=n*.5+.5,a.y=i*.5*y+.5,f.push(a.x,a.y),p++}for(let e=0;e<r;e++){let t=i+e,r=b+e;n===!0?l.push(r,r+1,t):l.push(r+1,r,t),_+=3}c.addGroup(g,_,n===!0?1:2),g+=_}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.radiusTop,t.radiusBottom,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}},xi=class e extends bi{constructor(e=1,t=1,n=32,r=1,i=!1,a=0,o=Math.PI*2){super(0,e,t,n,r,i,a,o),this.type=`ConeGeometry`,this.parameters={radius:e,height:t,radialSegments:n,heightSegments:r,openEnded:i,thetaStart:a,thetaLength:o}}static fromJSON(t){return new e(t.radius,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}},Si=class e extends Hn{constructor(e=[],t=[],n=1,r=0){super(),this.type=`PolyhedronGeometry`,this.parameters={vertices:e,indices:t,radius:n,detail:r};let i=[],a=[];o(r),c(n),l(),this.setAttribute(`position`,new W(i,3)),this.setAttribute(`normal`,new W(i.slice(),3)),this.setAttribute(`uv`,new W(a,2)),r===0?this.computeVertexNormals():this.normalizeNormals();function o(e){let n=new V,r=new V,i=new V;for(let a=0;a<t.length;a+=3)f(t[a+0],n),f(t[a+1],r),f(t[a+2],i),s(n,r,i,e)}function s(e,t,n,r){let i=r+1,a=[];for(let r=0;r<=i;r++){a[r]=[];let o=e.clone().lerp(n,r/i),s=t.clone().lerp(n,r/i),c=i-r;for(let e=0;e<=c;e++)e===0&&r===i?a[r][e]=o:a[r][e]=o.clone().lerp(s,e/c)}for(let e=0;e<i;e++)for(let t=0;t<2*(i-e)-1;t++){let n=Math.floor(t/2);t%2==0?(d(a[e][n+1]),d(a[e+1][n]),d(a[e][n])):(d(a[e][n+1]),d(a[e+1][n+1]),d(a[e+1][n]))}}function c(e){let t=new V;for(let n=0;n<i.length;n+=3)t.x=i[n+0],t.y=i[n+1],t.z=i[n+2],t.normalize().multiplyScalar(e),i[n+0]=t.x,i[n+1]=t.y,i[n+2]=t.z}function l(){let e=new V;for(let t=0;t<i.length;t+=3){e.x=i[t+0],e.y=i[t+1],e.z=i[t+2];let n=h(e)/2/Math.PI+.5,r=g(e)/Math.PI+.5;a.push(n,1-r)}p(),u()}function u(){for(let e=0;e<a.length;e+=6){let t=a[e+0],n=a[e+2],r=a[e+4];Math.max(t,n,r)>.9&&Math.min(t,n,r)<.1&&(t<.2&&(a[e+0]+=1),n<.2&&(a[e+2]+=1),r<.2&&(a[e+4]+=1))}}function d(e){i.push(e.x,e.y,e.z)}function f(t,n){let r=t*3;n.x=e[r+0],n.y=e[r+1],n.z=e[r+2]}function p(){let e=new V,t=new V,n=new V,r=new V,o=new z,s=new z,c=new z;for(let l=0,u=0;l<i.length;l+=9,u+=6){e.set(i[l+0],i[l+1],i[l+2]),t.set(i[l+3],i[l+4],i[l+5]),n.set(i[l+6],i[l+7],i[l+8]),o.set(a[u+0],a[u+1]),s.set(a[u+2],a[u+3]),c.set(a[u+4],a[u+5]),r.copy(e).add(t).add(n).divideScalar(3);let d=h(r);m(o,u+0,e,d),m(s,u+2,t,d),m(c,u+4,n,d)}}function m(e,t,n,r){r<0&&e.x===1&&(a[t]=e.x-1),n.x===0&&n.z===0&&(a[t]=r/2/Math.PI+.5)}function h(e){return Math.atan2(e.z,-e.x)}function g(e){return Math.atan2(-e.y,Math.sqrt(e.x*e.x+e.z*e.z))}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.vertices,t.indices,t.radius,t.detail)}},Ci=class e extends Si{constructor(e=1,t=0){let n=(1+Math.sqrt(5))/2,r=1/n,i=[-1,-1,-1,-1,-1,1,-1,1,-1,-1,1,1,1,-1,-1,1,-1,1,1,1,-1,1,1,1,0,-r,-n,0,-r,n,0,r,-n,0,r,n,-r,-n,0,-r,n,0,r,-n,0,r,n,0,-n,0,-r,n,0,-r,-n,0,r,n,0,r];super(i,[3,11,7,3,7,15,3,15,13,7,19,17,7,17,6,7,6,15,17,4,8,17,8,10,17,10,6,8,0,16,8,16,2,8,2,10,0,12,1,0,1,18,0,18,16,6,10,2,6,2,13,6,13,15,2,16,18,2,18,3,2,3,13,18,1,9,18,9,11,18,11,3,4,14,12,4,12,0,4,0,8,11,9,5,11,5,19,11,19,7,19,5,14,19,14,4,19,4,17,1,12,14,1,14,5,1,5,9],e,t),this.type=`DodecahedronGeometry`,this.parameters={radius:e,detail:t}}static fromJSON(t){return new e(t.radius,t.detail)}},wi=class{constructor(){this.type=`Curve`,this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){F(`Curve: .getPoint() not implemented.`)}getPointAt(e,t){let n=this.getUtoTmapping(e);return this.getPoint(n,t)}getPoints(e=5){let t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return t}getSpacedPoints(e=5){let t=[];for(let n=0;n<=e;n++)t.push(this.getPointAt(n/e));return t}getLength(){let e=this.getLengths();return e[e.length-1]}getLengths(e=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===e+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;let t=[],n,r=this.getPoint(0),i=0;t.push(0);for(let a=1;a<=e;a++)n=this.getPoint(a/e),i+=n.distanceTo(r),t.push(i),r=n;return this.cacheArcLengths=t,t}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(e,t=null){let n=this.getLengths(),r=0,i=n.length,a;a=t||e*n[i-1];let o=0,s=i-1,c;for(;o<=s;)if(r=Math.floor(o+(s-o)/2),c=n[r]-a,c<0)o=r+1;else if(c>0)s=r-1;else{s=r;break}if(r=s,n[r]===a)return r/(i-1);let l=n[r],u=n[r+1]-l,d=(a-l)/u;return(r+d)/(i-1)}getTangent(e,t){let n=1e-4,r=e-n,i=e+n;r<0&&(r=0),i>1&&(i=1);let a=this.getPoint(r),o=this.getPoint(i),s=t||(a.isVector2?new z:new V);return s.copy(o).sub(a).normalize(),s}getTangentAt(e,t){let n=this.getUtoTmapping(e);return this.getTangent(n,t)}computeFrenetFrames(e,t=!1){let n=new V,r=[],i=[],a=[],o=new V,s=new ft;for(let t=0;t<=e;t++){let n=t/e;r[t]=this.getTangentAt(n,new V)}i[0]=new V,a[0]=new V;let c=Number.MAX_VALUE,l=Math.abs(r[0].x),u=Math.abs(r[0].y),d=Math.abs(r[0].z);l<=c&&(c=l,n.set(1,0,0)),u<=c&&(c=u,n.set(0,1,0)),d<=c&&n.set(0,0,1),o.crossVectors(r[0],n).normalize(),i[0].crossVectors(r[0],o),a[0].crossVectors(r[0],i[0]);for(let t=1;t<=e;t++){if(i[t]=i[t-1].clone(),a[t]=a[t-1].clone(),o.crossVectors(r[t-1],r[t]),o.length()>2**-52){o.normalize();let e=Math.acos(I(r[t-1].dot(r[t]),-1,1));i[t].applyMatrix4(s.makeRotationAxis(o,e))}a[t].crossVectors(r[t],i[t])}if(t===!0){let t=Math.acos(I(i[0].dot(i[e]),-1,1));t/=e,r[0].dot(o.crossVectors(i[0],i[e]))>0&&(t=-t);for(let n=1;n<=e;n++)i[n].applyMatrix4(s.makeRotationAxis(r[n],t*n)),a[n].crossVectors(r[n],i[n])}return{tangents:r,normals:i,binormals:a}}clone(){return new this.constructor().copy(this)}copy(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}toJSON(){let e={metadata:{version:4.7,type:`Curve`,generator:`Curve.toJSON`}};return e.arcLengthDivisions=this.arcLengthDivisions,e.type=this.type,e}fromJSON(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}},Ti=class extends wi{constructor(e=0,t=0,n=1,r=1,i=0,a=Math.PI*2,o=!1,s=0){super(),this.isEllipseCurve=!0,this.type=`EllipseCurve`,this.aX=e,this.aY=t,this.xRadius=n,this.yRadius=r,this.aStartAngle=i,this.aEndAngle=a,this.aClockwise=o,this.aRotation=s}getPoint(e,t=new z){let n=t,r=Math.PI*2,i=this.aEndAngle-this.aStartAngle,a=Math.abs(i)<2**-52;for(;i<0;)i+=r;for(;i>r;)i-=r;i<2**-52&&(i=a?0:r),this.aClockwise===!0&&!a&&(i===r?i=-r:i-=r);let o=this.aStartAngle+e*i,s=this.aX+this.xRadius*Math.cos(o),c=this.aY+this.yRadius*Math.sin(o);if(this.aRotation!==0){let e=Math.cos(this.aRotation),t=Math.sin(this.aRotation),n=s-this.aX,r=c-this.aY;s=n*e-r*t+this.aX,c=n*t+r*e+this.aY}return n.set(s,c)}copy(e){return super.copy(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}toJSON(){let e=super.toJSON();return e.aX=this.aX,e.aY=this.aY,e.xRadius=this.xRadius,e.yRadius=this.yRadius,e.aStartAngle=this.aStartAngle,e.aEndAngle=this.aEndAngle,e.aClockwise=this.aClockwise,e.aRotation=this.aRotation,e}fromJSON(e){return super.fromJSON(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}},Ei=class extends Ti{constructor(e,t,n,r,i,a){super(e,t,n,n,r,i,a),this.isArcCurve=!0,this.type=`ArcCurve`}};function Di(){let e=0,t=0,n=0,r=0;function i(i,a,o,s){e=i,t=o,n=-3*i+3*a-2*o-s,r=2*i-2*a+o+s}return{initCatmullRom:function(e,t,n,r,a){i(t,n,a*(n-e),a*(r-t))},initNonuniformCatmullRom:function(e,t,n,r,a,o,s){let c=(t-e)/a-(n-e)/(a+o)+(n-t)/o,l=(n-t)/o-(r-t)/(o+s)+(r-n)/s;c*=o,l*=o,i(t,n,c,l)},calc:function(i){let a=i*i,o=a*i;return e+t*i+n*a+r*o}}}var Oi=new V,ki=new V,Ai=new Di,ji=new Di,Mi=new Di,Ni=class extends wi{constructor(e=[],t=!1,n=`centripetal`,r=.5){super(),this.isCatmullRomCurve3=!0,this.type=`CatmullRomCurve3`,this.points=e,this.closed=t,this.curveType=n,this.tension=r}getPoint(e,t=new V){let n=t,r=this.points,i=r.length,a=(i-+!this.closed)*e,o=Math.floor(a),s=a-o;this.closed?o+=o>0?0:(Math.floor(Math.abs(o)/i)+1)*i:s===0&&o===i-1&&(o=i-2,s=1);let c,l;this.closed||o>0?c=r[(o-1)%i]:(ki.subVectors(r[0],r[1]).add(r[0]),c=ki);let u=r[o%i],d=r[(o+1)%i];if(this.closed||o+2<i?l=r[(o+2)%i]:(Oi.subVectors(r[i-1],r[i-2]).add(r[i-1]),l=Oi),this.curveType===`centripetal`||this.curveType===`chordal`){let e=this.curveType===`chordal`?.5:.25,t=c.distanceToSquared(u)**+e,n=u.distanceToSquared(d)**+e,r=d.distanceToSquared(l)**+e;n<1e-4&&(n=1),t<1e-4&&(t=n),r<1e-4&&(r=n),Ai.initNonuniformCatmullRom(c.x,u.x,d.x,l.x,t,n,r),ji.initNonuniformCatmullRom(c.y,u.y,d.y,l.y,t,n,r),Mi.initNonuniformCatmullRom(c.z,u.z,d.z,l.z,t,n,r)}else this.curveType===`catmullrom`&&(Ai.initCatmullRom(c.x,u.x,d.x,l.x,this.tension),ji.initCatmullRom(c.y,u.y,d.y,l.y,this.tension),Mi.initCatmullRom(c.z,u.z,d.z,l.z,this.tension));return n.set(Ai.calc(s),ji.calc(s),Mi.calc(s)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let n=e.points[t];this.points.push(n.clone())}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){let n=this.points[t];e.points.push(n.toArray())}return e.closed=this.closed,e.curveType=this.curveType,e.tension=this.tension,e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let n=e.points[t];this.points.push(new V().fromArray(n))}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}};function Pi(e,t,n,r,i){let a=(r-t)*.5,o=(i-n)*.5,s=e*e,c=e*s;return(2*n-2*r+a+o)*c+(-3*n+3*r-2*a-o)*s+a*e+n}function Fi(e,t){let n=1-e;return n*n*t}function Ii(e,t){return 2*(1-e)*e*t}function Li(e,t){return e*e*t}function Ri(e,t,n,r){return Fi(e,t)+Ii(e,n)+Li(e,r)}function zi(e,t){let n=1-e;return n*n*n*t}function Bi(e,t){let n=1-e;return 3*n*n*e*t}function Vi(e,t){return 3*(1-e)*e*e*t}function Hi(e,t){return e*e*e*t}function Ui(e,t,n,r,i){return zi(e,t)+Bi(e,n)+Vi(e,r)+Hi(e,i)}var Wi=class extends wi{constructor(e=new z,t=new z,n=new z,r=new z){super(),this.isCubicBezierCurve=!0,this.type=`CubicBezierCurve`,this.v0=e,this.v1=t,this.v2=n,this.v3=r}getPoint(e,t=new z){let n=t,r=this.v0,i=this.v1,a=this.v2,o=this.v3;return n.set(Ui(e,r.x,i.x,a.x,o.x),Ui(e,r.y,i.y,a.y,o.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},Gi=class extends wi{constructor(e=new V,t=new V,n=new V,r=new V){super(),this.isCubicBezierCurve3=!0,this.type=`CubicBezierCurve3`,this.v0=e,this.v1=t,this.v2=n,this.v3=r}getPoint(e,t=new V){let n=t,r=this.v0,i=this.v1,a=this.v2,o=this.v3;return n.set(Ui(e,r.x,i.x,a.x,o.x),Ui(e,r.y,i.y,a.y,o.y),Ui(e,r.z,i.z,a.z,o.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},Ki=class extends wi{constructor(e=new z,t=new z){super(),this.isLineCurve=!0,this.type=`LineCurve`,this.v1=e,this.v2=t}getPoint(e,t=new z){let n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new z){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},qi=class extends wi{constructor(e=new V,t=new V){super(),this.isLineCurve3=!0,this.type=`LineCurve3`,this.v1=e,this.v2=t}getPoint(e,t=new V){let n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new V){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Ji=class extends wi{constructor(e=new z,t=new z,n=new z){super(),this.isQuadraticBezierCurve=!0,this.type=`QuadraticBezierCurve`,this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new z){let n=t,r=this.v0,i=this.v1,a=this.v2;return n.set(Ri(e,r.x,i.x,a.x),Ri(e,r.y,i.y,a.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Yi=class extends wi{constructor(e=new V,t=new V,n=new V){super(),this.isQuadraticBezierCurve3=!0,this.type=`QuadraticBezierCurve3`,this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new V){let n=t,r=this.v0,i=this.v1,a=this.v2;return n.set(Ri(e,r.x,i.x,a.x),Ri(e,r.y,i.y,a.y),Ri(e,r.z,i.z,a.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Xi=class extends wi{constructor(e=[]){super(),this.isSplineCurve=!0,this.type=`SplineCurve`,this.points=e}getPoint(e,t=new z){let n=t,r=this.points,i=(r.length-1)*e,a=Math.floor(i),o=i-a,s=r[a===0?a:a-1],c=r[a],l=r[a>r.length-2?r.length-1:a+1],u=r[a>r.length-3?r.length-1:a+2];return n.set(Pi(o,s.x,c.x,l.x,u.x),Pi(o,s.y,c.y,l.y,u.y)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let n=e.points[t];this.points.push(n.clone())}return this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){let n=this.points[t];e.points.push(n.toArray())}return e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let n=e.points[t];this.points.push(new z().fromArray(n))}return this}},Zi=Object.freeze({__proto__:null,ArcCurve:Ei,CatmullRomCurve3:Ni,CubicBezierCurve:Wi,CubicBezierCurve3:Gi,EllipseCurve:Ti,LineCurve:Ki,LineCurve3:qi,QuadraticBezierCurve:Ji,QuadraticBezierCurve3:Yi,SplineCurve:Xi}),Qi=class extends wi{constructor(){super(),this.type=`CurvePath`,this.curves=[],this.autoClose=!1}add(e){this.curves.push(e)}closePath(){let e=this.curves[0].getPoint(0),t=this.curves[this.curves.length-1].getPoint(1);if(!e.equals(t)){let n=e.isVector2===!0?`LineCurve`:`LineCurve3`;this.curves.push(new Zi[n](t,e))}return this}getPoint(e,t){let n=e*this.getLength(),r=this.getCurveLengths(),i=0;for(;i<r.length;){if(r[i]>=n){let e=r[i]-n,a=this.curves[i],o=a.getLength(),s=o===0?0:1-e/o;return a.getPointAt(s,t)}i++}return null}getLength(){let e=this.getCurveLengths();return e[e.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;let e=[],t=0;for(let n=0,r=this.curves.length;n<r;n++)t+=this.curves[n].getLength(),e.push(t);return this.cacheLengths=e,e}getSpacedPoints(e=40){let t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return this.autoClose&&t.push(t[0]),t}getPoints(e=12){let t=[],n;for(let r=0,i=this.curves;r<i.length;r++){let a=i[r],o=a.isEllipseCurve?e*2:a.isLineCurve||a.isLineCurve3?1:a.isSplineCurve?e*a.points.length:e,s=a.getPoints(o);for(let e=0;e<s.length;e++){let r=s[e];n&&n.equals(r)||(t.push(r),n=r)}}return this.autoClose&&t.length>1&&!t[t.length-1].equals(t[0])&&t.push(t[0]),t}copy(e){super.copy(e),this.curves=[];for(let t=0,n=e.curves.length;t<n;t++){let n=e.curves[t];this.curves.push(n.clone())}return this.autoClose=e.autoClose,this}toJSON(){let e=super.toJSON();e.autoClose=this.autoClose,e.curves=[];for(let t=0,n=this.curves.length;t<n;t++){let n=this.curves[t];e.curves.push(n.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.autoClose=e.autoClose,this.curves=[];for(let t=0,n=e.curves.length;t<n;t++){let n=e.curves[t];this.curves.push(new Zi[n.type]().fromJSON(n))}return this}},$i=class extends Qi{constructor(e){super(),this.type=`Path`,this.currentPoint=new z,e&&this.setFromPoints(e)}setFromPoints(e){this.moveTo(e[0].x,e[0].y);for(let t=1,n=e.length;t<n;t++)this.lineTo(e[t].x,e[t].y);return this}moveTo(e,t){return this.currentPoint.set(e,t),this}lineTo(e,t){let n=new Ki(this.currentPoint.clone(),new z(e,t));return this.curves.push(n),this.currentPoint.set(e,t),this}quadraticCurveTo(e,t,n,r){let i=new Ji(this.currentPoint.clone(),new z(e,t),new z(n,r));return this.curves.push(i),this.currentPoint.set(n,r),this}bezierCurveTo(e,t,n,r,i,a){let o=new Wi(this.currentPoint.clone(),new z(e,t),new z(n,r),new z(i,a));return this.curves.push(o),this.currentPoint.set(i,a),this}splineThru(e){let t=new Xi([this.currentPoint.clone()].concat(e));return this.curves.push(t),this.currentPoint.copy(e[e.length-1]),this}arc(e,t,n,r,i,a){let o=this.currentPoint.x,s=this.currentPoint.y;return this.absarc(e+o,t+s,n,r,i,a),this}absarc(e,t,n,r,i,a){return this.absellipse(e,t,n,n,r,i,a),this}ellipse(e,t,n,r,i,a,o,s){let c=this.currentPoint.x,l=this.currentPoint.y;return this.absellipse(e+c,t+l,n,r,i,a,o,s),this}absellipse(e,t,n,r,i,a,o,s){let c=new Ti(e,t,n,r,i,a,o,s);if(this.curves.length>0){let e=c.getPoint(0);e.equals(this.currentPoint)||this.lineTo(e.x,e.y)}this.curves.push(c);let l=c.getPoint(1);return this.currentPoint.copy(l),this}copy(e){return super.copy(e),this.currentPoint.copy(e.currentPoint),this}toJSON(){let e=super.toJSON();return e.currentPoint=this.currentPoint.toArray(),e}fromJSON(e){return super.fromJSON(e),this.currentPoint.fromArray(e.currentPoint),this}},ea=class extends $i{constructor(e){super(e),this.uuid=Ce(),this.type=`Shape`,this.holes=[]}getPointsHoles(e){let t=[];for(let n=0,r=this.holes.length;n<r;n++)t[n]=this.holes[n].getPoints(e);return t}extractPoints(e){return{shape:this.getPoints(e),holes:this.getPointsHoles(e)}}copy(e){super.copy(e),this.holes=[];for(let t=0,n=e.holes.length;t<n;t++){let n=e.holes[t];this.holes.push(n.clone())}return this}toJSON(){let e=super.toJSON();e.uuid=this.uuid,e.holes=[];for(let t=0,n=this.holes.length;t<n;t++){let n=this.holes[t];e.holes.push(n.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.uuid=e.uuid,this.holes=[];for(let t=0,n=e.holes.length;t<n;t++){let n=e.holes[t];this.holes.push(new $i().fromJSON(n))}return this}};function ta(e,t,n=2){let r=t&&t.length,i=r?t[0]*n:e.length,a=na(e,0,i,n,!0),o=[];if(!a||a.next===a.prev)return o;let s,c,l;if(r&&(a=la(e,t,a,n)),e.length>80*n){s=e[0],c=e[1];let t=s,r=c;for(let a=n;a<i;a+=n){let n=e[a],i=e[a+1];n<s&&(s=n),i<c&&(c=i),n>t&&(t=n),i>r&&(r=i)}l=Math.max(t-s,r-c),l=l===0?0:32767/l}return ia(a,o,n,s,c,l,0),o}function na(e,t,n,r,i){let a;if(i===Na(e,t,n,r)>0)for(let i=t;i<n;i+=r)a=Aa(i/r|0,e[i],e[i+1],a);else for(let i=n-r;i>=t;i-=r)a=Aa(i/r|0,e[i],e[i+1],a);return a&&Sa(a,a.next)&&(ja(a),a=a.next),a}function ra(e,t){if(!e)return e;t||=e;let n=e,r;do if(r=!1,!n.steiner&&(Sa(n,n.next)||xa(n.prev,n,n.next)===0)){if(ja(n),n=t=n.prev,n===n.next)break;r=!0}else n=n.next;while(r||n!==t);return t}function ia(e,t,n,r,i,a,o){if(!e)return;!o&&a&&ma(e,r,i,a);let s=e;for(;e.prev!==e.next;){let c=e.prev,l=e.next;if(a?oa(e,r,i,a):aa(e)){t.push(c.i,e.i,l.i),ja(e),e=l.next,s=l.next;continue}if(e=l,e===s){o?o===1?(e=sa(ra(e),t),ia(e,t,n,r,i,a,2)):o===2&&ca(e,t,n,r,i,a):ia(ra(e),t,n,r,i,a,1);break}}}function aa(e){let t=e.prev,n=e,r=e.next;if(xa(t,n,r)>=0)return!1;let i=t.x,a=n.x,o=r.x,s=t.y,c=n.y,l=r.y,u=Math.min(i,a,o),d=Math.min(s,c,l),f=Math.max(i,a,o),p=Math.max(s,c,l),m=r.next;for(;m!==t;){if(m.x>=u&&m.x<=f&&m.y>=d&&m.y<=p&&ya(i,s,a,c,o,l,m.x,m.y)&&xa(m.prev,m,m.next)>=0)return!1;m=m.next}return!0}function oa(e,t,n,r){let i=e.prev,a=e,o=e.next;if(xa(i,a,o)>=0)return!1;let s=i.x,c=a.x,l=o.x,u=i.y,d=a.y,f=o.y,p=Math.min(s,c,l),m=Math.min(u,d,f),h=Math.max(s,c,l),g=Math.max(u,d,f),_=ga(p,m,t,n,r),v=ga(h,g,t,n,r),y=e.prevZ,b=e.nextZ;for(;y&&y.z>=_&&b&&b.z<=v;){if(y.x>=p&&y.x<=h&&y.y>=m&&y.y<=g&&y!==i&&y!==o&&ya(s,u,c,d,l,f,y.x,y.y)&&xa(y.prev,y,y.next)>=0||(y=y.prevZ,b.x>=p&&b.x<=h&&b.y>=m&&b.y<=g&&b!==i&&b!==o&&ya(s,u,c,d,l,f,b.x,b.y)&&xa(b.prev,b,b.next)>=0))return!1;b=b.nextZ}for(;y&&y.z>=_;){if(y.x>=p&&y.x<=h&&y.y>=m&&y.y<=g&&y!==i&&y!==o&&ya(s,u,c,d,l,f,y.x,y.y)&&xa(y.prev,y,y.next)>=0)return!1;y=y.prevZ}for(;b&&b.z<=v;){if(b.x>=p&&b.x<=h&&b.y>=m&&b.y<=g&&b!==i&&b!==o&&ya(s,u,c,d,l,f,b.x,b.y)&&xa(b.prev,b,b.next)>=0)return!1;b=b.nextZ}return!0}function sa(e,t){let n=e;do{let r=n.prev,i=n.next.next;!Sa(r,i)&&Ca(r,n,n.next,i)&&Da(r,i)&&Da(i,r)&&(t.push(r.i,n.i,i.i),ja(n),ja(n.next),n=e=i),n=n.next}while(n!==e);return ra(n)}function ca(e,t,n,r,i,a){let o=e;do{let e=o.next.next;for(;e!==o.prev;){if(o.i!==e.i&&ba(o,e)){let s=ka(o,e);o=ra(o,o.next),s=ra(s,s.next),ia(o,t,n,r,i,a,0),ia(s,t,n,r,i,a,0);return}e=e.next}o=o.next}while(o!==e)}function la(e,t,n,r){let i=[];for(let n=0,a=t.length;n<a;n++){let o=na(e,t[n]*r,n<a-1?t[n+1]*r:e.length,r,!1);o===o.next&&(o.steiner=!0),i.push(_a(o))}i.sort(ua);for(let e=0;e<i.length;e++)n=da(i[e],n);return n}function ua(e,t){let n=e.x-t.x;return n===0&&(n=e.y-t.y,n===0&&(n=(e.next.y-e.y)/(e.next.x-e.x)-(t.next.y-t.y)/(t.next.x-t.x))),n}function da(e,t){let n=fa(e,t);if(!n)return t;let r=ka(n,e);return ra(r,r.next),ra(n,n.next)}function fa(e,t){let n=t,r=e.x,i=e.y,a=-1/0,o;if(Sa(e,n))return n;do{if(Sa(e,n.next))return n.next;if(i<=n.y&&i>=n.next.y&&n.next.y!==n.y){let e=n.x+(i-n.y)*(n.next.x-n.x)/(n.next.y-n.y);if(e<=r&&e>a&&(a=e,o=n.x<n.next.x?n:n.next,e===r))return o}n=n.next}while(n!==t);if(!o)return null;let s=o,c=o.x,l=o.y,u=1/0;n=o;do{if(r>=n.x&&n.x>=c&&r!==n.x&&va(i<l?r:a,i,c,l,i<l?a:r,i,n.x,n.y)){let t=Math.abs(i-n.y)/(r-n.x);Da(n,e)&&(t<u||t===u&&(n.x>o.x||n.x===o.x&&pa(o,n)))&&(o=n,u=t)}n=n.next}while(n!==s);return o}function pa(e,t){return xa(e.prev,e,t.prev)<0&&xa(t.next,e,e.next)<0}function ma(e,t,n,r){let i=e;do i.z===0&&(i.z=ga(i.x,i.y,t,n,r)),i.prevZ=i.prev,i.nextZ=i.next,i=i.next;while(i!==e);i.prevZ.nextZ=null,i.prevZ=null,ha(i)}function ha(e){let t,n=1;do{let r=e,i;e=null;let a=null;for(t=0;r;){t++;let o=r,s=0;for(let e=0;e<n&&(s++,o=o.nextZ,o);e++);let c=n;for(;s>0||c>0&&o;)s!==0&&(c===0||!o||r.z<=o.z)?(i=r,r=r.nextZ,s--):(i=o,o=o.nextZ,c--),a?a.nextZ=i:e=i,i.prevZ=a,a=i;r=o}a.nextZ=null,n*=2}while(t>1);return e}function ga(e,t,n,r,i){return e=(e-n)*i|0,t=(t-r)*i|0,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,t=(t|t<<8)&16711935,t=(t|t<<4)&252645135,t=(t|t<<2)&858993459,t=(t|t<<1)&1431655765,e|t<<1}function _a(e){let t=e,n=e;do(t.x<n.x||t.x===n.x&&t.y<n.y)&&(n=t),t=t.next;while(t!==e);return n}function va(e,t,n,r,i,a,o,s){return(i-o)*(t-s)>=(e-o)*(a-s)&&(e-o)*(r-s)>=(n-o)*(t-s)&&(n-o)*(a-s)>=(i-o)*(r-s)}function ya(e,t,n,r,i,a,o,s){return(e!==o||t!==s)&&va(e,t,n,r,i,a,o,s)}function ba(e,t){return e.next.i!==t.i&&e.prev.i!==t.i&&!Ea(e,t)&&(Da(e,t)&&Da(t,e)&&Oa(e,t)&&(xa(e.prev,e,t.prev)||xa(e,t.prev,t))||Sa(e,t)&&xa(e.prev,e,e.next)>0&&xa(t.prev,t,t.next)>0)}function xa(e,t,n){return(t.y-e.y)*(n.x-t.x)-(t.x-e.x)*(n.y-t.y)}function Sa(e,t){return e.x===t.x&&e.y===t.y}function Ca(e,t,n,r){let i=Ta(xa(e,t,n)),a=Ta(xa(e,t,r)),o=Ta(xa(n,r,e)),s=Ta(xa(n,r,t));return!!(i!==a&&o!==s||i===0&&wa(e,n,t)||a===0&&wa(e,r,t)||o===0&&wa(n,e,r)||s===0&&wa(n,t,r))}function wa(e,t,n){return t.x<=Math.max(e.x,n.x)&&t.x>=Math.min(e.x,n.x)&&t.y<=Math.max(e.y,n.y)&&t.y>=Math.min(e.y,n.y)}function Ta(e){return e>0?1:e<0?-1:0}function Ea(e,t){let n=e;do{if(n.i!==e.i&&n.next.i!==e.i&&n.i!==t.i&&n.next.i!==t.i&&Ca(n,n.next,e,t))return!0;n=n.next}while(n!==e);return!1}function Da(e,t){return xa(e.prev,e,e.next)<0?xa(e,t,e.next)>=0&&xa(e,e.prev,t)>=0:xa(e,t,e.prev)<0||xa(e,e.next,t)<0}function Oa(e,t){let n=e,r=!1,i=(e.x+t.x)/2,a=(e.y+t.y)/2;do n.y>a!=n.next.y>a&&n.next.y!==n.y&&i<(n.next.x-n.x)*(a-n.y)/(n.next.y-n.y)+n.x&&(r=!r),n=n.next;while(n!==e);return r}function ka(e,t){let n=Ma(e.i,e.x,e.y),r=Ma(t.i,t.x,t.y),i=e.next,a=t.prev;return e.next=t,t.prev=e,n.next=i,i.prev=n,r.next=n,n.prev=r,a.next=r,r.prev=a,r}function Aa(e,t,n,r){let i=Ma(e,t,n);return r?(i.next=r.next,i.prev=r,r.next.prev=i,r.next=i):(i.prev=i,i.next=i),i}function ja(e){e.next.prev=e.prev,e.prev.next=e.next,e.prevZ&&(e.prevZ.nextZ=e.nextZ),e.nextZ&&(e.nextZ.prevZ=e.prevZ)}function Ma(e,t,n){return{i:e,x:t,y:n,prev:null,next:null,z:0,prevZ:null,nextZ:null,steiner:!1}}function Na(e,t,n,r){let i=0;for(let a=t,o=n-r;a<n;a+=r)i+=(e[o]-e[a])*(e[a+1]+e[o+1]),o=a;return i}var Pa=class{static triangulate(e,t,n=2){return ta(e,t,n)}},Fa=class e{static area(e){let t=e.length,n=0;for(let r=t-1,i=0;i<t;r=i++)n+=e[r].x*e[i].y-e[i].x*e[r].y;return n*.5}static isClockWise(t){return e.area(t)<0}static triangulateShape(e,t){let n=[],r=[],i=[];Ia(e),La(n,e);let a=e.length;t.forEach(Ia);for(let e=0;e<t.length;e++)r.push(a),a+=t[e].length,La(n,t[e]);let o=Pa.triangulate(n,r);for(let e=0;e<o.length;e+=3)i.push(o.slice(e,e+3));return i}};function Ia(e){let t=e.length;t>2&&e[t-1].equals(e[0])&&e.pop()}function La(e,t){for(let n=0;n<t.length;n++)e.push(t[n].x),e.push(t[n].y)}var Ra=class e extends Hn{constructor(e=new ea([new z(.5,.5),new z(-.5,.5),new z(-.5,-.5),new z(.5,-.5)]),t={}){super(),this.type=`ExtrudeGeometry`,this.parameters={shapes:e,options:t},e=Array.isArray(e)?e:[e];let n=this,r=[],i=[];for(let t=0,n=e.length;t<n;t++){let n=e[t];a(n)}this.setAttribute(`position`,new W(r,3)),this.setAttribute(`uv`,new W(i,2)),this.computeVertexNormals();function a(e){let a=[],o=t.curveSegments===void 0?12:t.curveSegments,s=t.steps===void 0?1:t.steps,c=t.depth===void 0?1:t.depth,l=t.bevelEnabled===void 0||t.bevelEnabled,u=t.bevelThickness===void 0?.2:t.bevelThickness,d=t.bevelSize===void 0?u-.1:t.bevelSize,f=t.bevelOffset===void 0?0:t.bevelOffset,p=t.bevelSegments===void 0?3:t.bevelSegments,m=t.extrudePath,h=t.UVGenerator===void 0?za:t.UVGenerator,g,_=!1,v,y,b,x;if(m){g=m.getSpacedPoints(s),_=!0,l=!1;let e=m.isCatmullRomCurve3?m.closed:!1;v=m.computeFrenetFrames(s,e),y=new V,b=new V,x=new V}l||(p=0,u=0,d=0,f=0);let S=e.extractPoints(o),C=S.shape,w=S.holes;if(!Fa.isClockWise(C)){C=C.reverse();for(let e=0,t=w.length;e<t;e++){let t=w[e];Fa.isClockWise(t)&&(w[e]=t.reverse())}}function T(e){let t=e[0];for(let n=1;n<=e.length;n++){let r=n%e.length,i=e[r],a=i.x-t.x,o=i.y-t.y,s=a*a+o*o,c=Math.max(Math.abs(i.x),Math.abs(i.y),Math.abs(t.x),Math.abs(t.y));if(s<=10000000000000001e-36*c*c){e.splice(r,1),n--;continue}t=i}}T(C),w.forEach(T);let E=w.length,D=C;for(let e=0;e<E;e++){let t=w[e];C=C.concat(t)}function O(e,t,n){return t||me(`ExtrudeGeometry: vec does not exist`),e.clone().addScaledVector(t,n)}let k=C.length;function A(e,t,n){let r,i,a,o=e.x-t.x,s=e.y-t.y,c=n.x-e.x,l=n.y-e.y,u=o*o+s*s,d=o*l-s*c;if(Math.abs(d)>2**-52){let d=Math.sqrt(u),f=Math.sqrt(c*c+l*l),p=t.x-s/d,m=t.y+o/d,h=n.x-l/f,g=n.y+c/f,_=((h-p)*l-(g-m)*c)/(o*l-s*c);r=p+o*_-e.x,i=m+s*_-e.y;let v=r*r+i*i;if(v<=2)return new z(r,i);a=Math.sqrt(v/2)}else{let e=!1;o>2**-52?c>2**-52&&(e=!0):o<-(2**-52)?c<-(2**-52)&&(e=!0):Math.sign(s)===Math.sign(l)&&(e=!0),e?(r=-s,i=o,a=Math.sqrt(u)):(r=o,i=s,a=Math.sqrt(u/2))}return new z(r/a,i/a)}let j=[];for(let e=0,t=D.length,n=t-1,r=e+1;e<t;e++,n++,r++)n===t&&(n=0),r===t&&(r=0),j[e]=A(D[e],D[n],D[r]);let M=[],ee,N=j.concat();for(let e=0,t=E;e<t;e++){let t=w[e];ee=[];for(let e=0,n=t.length,r=n-1,i=e+1;e<n;e++,r++,i++)r===n&&(r=0),i===n&&(i=0),ee[e]=A(t[e],t[r],t[i]);M.push(ee),N=N.concat(ee)}let te;if(p===0)te=Fa.triangulateShape(D,w);else{let e=[],t=[];for(let n=0;n<p;n++){let r=n/p,i=u*Math.cos(r*Math.PI/2),a=d*Math.sin(r*Math.PI/2)+f;for(let t=0,n=D.length;t<n;t++){let n=O(D[t],j[t],a);oe(n.x,n.y,-i),r===0&&e.push(n)}for(let e=0,n=E;e<n;e++){let n=w[e];ee=M[e];let o=[];for(let e=0,t=n.length;e<t;e++){let t=O(n[e],ee[e],a);oe(t.x,t.y,-i),r===0&&o.push(t)}r===0&&t.push(o)}}te=Fa.triangulateShape(e,t)}let ne=te.length,P=d+f;for(let e=0;e<k;e++){let t=l?O(C[e],N[e],P):C[e];_?(b.copy(v.normals[0]).multiplyScalar(t.x),y.copy(v.binormals[0]).multiplyScalar(t.y),x.copy(g[0]).add(b).add(y),oe(x.x,x.y,x.z)):oe(t.x,t.y,0)}for(let e=1;e<=s;e++)for(let t=0;t<k;t++){let n=l?O(C[t],N[t],P):C[t];_?(b.copy(v.normals[e]).multiplyScalar(n.x),y.copy(v.binormals[e]).multiplyScalar(n.y),x.copy(g[e]).add(b).add(y),oe(x.x,x.y,x.z)):oe(n.x,n.y,c/s*e)}for(let e=p-1;e>=0;e--){let t=e/p,n=u*Math.cos(t*Math.PI/2),r=d*Math.sin(t*Math.PI/2)+f;for(let e=0,t=D.length;e<t;e++){let t=O(D[e],j[e],r);oe(t.x,t.y,c+n)}for(let e=0,t=w.length;e<t;e++){let t=w[e];ee=M[e];for(let e=0,i=t.length;e<i;e++){let i=O(t[e],ee[e],r);_?oe(i.x,i.y+g[s-1].y,g[s-1].x+n):oe(i.x,i.y,c+n)}}}re(),ie();function re(){let e=r.length/3;if(l){let e=0,t=k*e;for(let e=0;e<ne;e++){let n=te[e];se(n[2]+t,n[1]+t,n[0]+t)}e=s+p*2,t=k*e;for(let e=0;e<ne;e++){let n=te[e];se(n[0]+t,n[1]+t,n[2]+t)}}else{for(let e=0;e<ne;e++){let t=te[e];se(t[2],t[1],t[0])}for(let e=0;e<ne;e++){let t=te[e];se(t[0]+k*s,t[1]+k*s,t[2]+k*s)}}n.addGroup(e,r.length/3-e,0)}function ie(){let e=r.length/3,t=0;ae(D,t),t+=D.length;for(let e=0,n=w.length;e<n;e++){let n=w[e];ae(n,t),t+=n.length}n.addGroup(e,r.length/3-e,1)}function ae(e,t){let n=e.length;for(;--n>=0;){let r=n,i=n-1;i<0&&(i=e.length-1);for(let e=0,n=s+p*2;e<n;e++){let n=k*e,a=k*(e+1);ce(t+r+n,t+i+n,t+i+a,t+r+a)}}}function oe(e,t,n){a.push(e),a.push(t),a.push(n)}function se(e,t,i){le(e),le(t),le(i);let a=r.length/3,o=h.generateTopUV(n,r,a-3,a-2,a-1);ue(o[0]),ue(o[1]),ue(o[2])}function ce(e,t,i,a){le(e),le(t),le(a),le(t),le(i),le(a);let o=r.length/3,s=h.generateSideWallUV(n,r,o-6,o-3,o-2,o-1);ue(s[0]),ue(s[1]),ue(s[3]),ue(s[1]),ue(s[2]),ue(s[3])}function le(e){r.push(a[e*3+0]),r.push(a[e*3+1]),r.push(a[e*3+2])}function ue(e){i.push(e.x),i.push(e.y)}}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}toJSON(){let e=super.toJSON(),t=this.parameters.shapes,n=this.parameters.options;return Ba(t,n,e)}static fromJSON(t,n){let r=[];for(let e=0,i=t.shapes.length;e<i;e++){let i=n[t.shapes[e]];r.push(i)}let i=t.options.extrudePath;return i!==void 0&&(t.options.extrudePath=new Zi[i.type]().fromJSON(i)),new e(r,t.options)}},za={generateTopUV:function(e,t,n,r,i){let a=t[n*3],o=t[n*3+1],s=t[r*3],c=t[r*3+1],l=t[i*3],u=t[i*3+1];return[new z(a,o),new z(s,c),new z(l,u)]},generateSideWallUV:function(e,t,n,r,i,a){let o=t[n*3],s=t[n*3+1],c=t[n*3+2],l=t[r*3],u=t[r*3+1],d=t[r*3+2],f=t[i*3],p=t[i*3+1],m=t[i*3+2],h=t[a*3],g=t[a*3+1],_=t[a*3+2];return Math.abs(s-u)<Math.abs(o-l)?[new z(o,1-c),new z(l,1-d),new z(f,1-m),new z(h,1-_)]:[new z(s,1-c),new z(u,1-d),new z(p,1-m),new z(g,1-_)]}};function Ba(e,t,n){if(n.shapes=[],Array.isArray(e))for(let t=0,r=e.length;t<r;t++){let r=e[t];n.shapes.push(r.uuid)}else n.shapes.push(e.uuid);return n.options=Object.assign({},t),t.extrudePath!==void 0&&(n.options.extrudePath=t.extrudePath.toJSON()),n}var Va=class e extends Si{constructor(e=1,t=0){let n=(1+Math.sqrt(5))/2,r=[-1,n,0,1,n,0,-1,-n,0,1,-n,0,0,-1,n,0,1,n,0,-1,-n,0,1,-n,n,0,-1,n,0,1,-n,0,-1,-n,0,1];super(r,[0,11,5,0,5,1,0,1,7,0,7,10,0,10,11,1,5,9,5,11,4,11,10,2,10,7,6,7,1,8,3,9,4,3,4,2,3,2,6,3,6,8,3,8,9,4,9,5,2,4,11,6,2,10,8,6,7,9,8,1],e,t),this.type=`IcosahedronGeometry`,this.parameters={radius:e,detail:t}}static fromJSON(t){return new e(t.radius,t.detail)}},Ha=class e extends Hn{constructor(e=[new z(0,-.5),new z(.5,0),new z(0,.5)],t=12,n=0,r=Math.PI*2){super(),this.type=`LatheGeometry`,this.parameters={points:e,segments:t,phiStart:n,phiLength:r},t=Math.floor(t),r=I(r,0,Math.PI*2);let i=[],a=[],o=[],s=[],c=[],l=1/t,u=new V,d=new z,f=new V,p=new V,m=new V,h=0,g=0;for(let t=0;t<=e.length-1;t++)switch(t){case 0:h=e[t+1].x-e[t].x,g=e[t+1].y-e[t].y,f.x=g*1,f.y=-h,f.z=g*0,m.copy(f),f.normalize(),s.push(f.x,f.y,f.z);break;case e.length-1:s.push(m.x,m.y,m.z);break;default:h=e[t+1].x-e[t].x,g=e[t+1].y-e[t].y,f.x=g*1,f.y=-h,f.z=g*0,p.copy(f),f.x+=m.x,f.y+=m.y,f.z+=m.z,f.normalize(),s.push(f.x,f.y,f.z),m.copy(p)}for(let i=0;i<=t;i++){let f=n+i*l*r,p=Math.sin(f),m=Math.cos(f);for(let n=0;n<=e.length-1;n++){u.x=e[n].x*p,u.y=e[n].y,u.z=e[n].x*m,a.push(u.x,u.y,u.z),d.x=i/t,d.y=n/(e.length-1),o.push(d.x,d.y);let r=s[3*n+0]*p,l=s[3*n+1],f=s[3*n+0]*m;c.push(r,l,f)}}for(let n=0;n<t;n++)for(let t=0;t<e.length-1;t++){let r=t+n*e.length,a=r,o=r+e.length,s=r+e.length+1,c=r+1;i.push(a,o,c),i.push(s,c,o)}this.setIndex(i),this.setAttribute(`position`,new W(a,3)),this.setAttribute(`uv`,new W(o,2)),this.setAttribute(`normal`,new W(c,3))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.points,t.segments,t.phiStart,t.phiLength)}},Ua=class e extends Si{constructor(e=1,t=0){super([1,0,0,-1,0,0,0,1,0,0,-1,0,0,0,1,0,0,-1],[0,2,4,0,4,3,0,3,5,0,5,2,1,2,5,1,5,3,1,3,4,1,4,2],e,t),this.type=`OctahedronGeometry`,this.parameters={radius:e,detail:t}}static fromJSON(t){return new e(t.radius,t.detail)}},Wa=class e extends Hn{constructor(e=1,t=1,n=1,r=1){super(),this.type=`PlaneGeometry`,this.parameters={width:e,height:t,widthSegments:n,heightSegments:r};let i=e/2,a=t/2,o=Math.floor(n),s=Math.floor(r),c=o+1,l=s+1,u=e/o,d=t/s,f=[],p=[],m=[],h=[];for(let e=0;e<l;e++){let t=e*d-a;for(let n=0;n<c;n++){let r=n*u-i;p.push(r,-t,0),m.push(0,0,1),h.push(n/o),h.push(1-e/s)}}for(let e=0;e<s;e++)for(let t=0;t<o;t++){let n=t+c*e,r=t+c*(e+1),i=t+1+c*(e+1),a=t+1+c*e;f.push(n,r,a),f.push(r,i,a)}this.setIndex(f),this.setAttribute(`position`,new W(p,3)),this.setAttribute(`normal`,new W(m,3)),this.setAttribute(`uv`,new W(h,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.width,t.height,t.widthSegments,t.heightSegments)}},Ga=class e extends Hn{constructor(e=.5,t=1,n=32,r=1,i=0,a=Math.PI*2){super(),this.type=`RingGeometry`,this.parameters={innerRadius:e,outerRadius:t,thetaSegments:n,phiSegments:r,thetaStart:i,thetaLength:a},n=Math.max(3,n),r=Math.max(1,r);let o=[],s=[],c=[],l=[],u=e,d=(t-e)/r,f=new V,p=new z;for(let e=0;e<=r;e++){for(let e=0;e<=n;e++){let r=i+e/n*a;f.x=u*Math.cos(r),f.y=u*Math.sin(r),s.push(f.x,f.y,f.z),c.push(0,0,1),p.x=(f.x/t+1)/2,p.y=(f.y/t+1)/2,l.push(p.x,p.y)}u+=d}for(let e=0;e<r;e++){let t=e*(n+1);for(let e=0;e<n;e++){let r=e+t,i=r,a=r+n+1,s=r+n+2,c=r+1;o.push(i,a,c),o.push(a,s,c)}}this.setIndex(o),this.setAttribute(`position`,new W(s,3)),this.setAttribute(`normal`,new W(c,3)),this.setAttribute(`uv`,new W(l,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.innerRadius,t.outerRadius,t.thetaSegments,t.phiSegments,t.thetaStart,t.thetaLength)}},Ka=class e extends Hn{constructor(e=new ea([new z(0,.5),new z(-.5,-.5),new z(.5,-.5)]),t=12){super(),this.type=`ShapeGeometry`,this.parameters={shapes:e,curveSegments:t};let n=[],r=[],i=[],a=[],o=0,s=0;if(Array.isArray(e)===!1)c(e);else for(let t=0;t<e.length;t++)c(e[t]),this.addGroup(o,s,t),o+=s,s=0;this.setIndex(n),this.setAttribute(`position`,new W(r,3)),this.setAttribute(`normal`,new W(i,3)),this.setAttribute(`uv`,new W(a,2));function c(e){let o=r.length/3,c=e.extractPoints(t),l=c.shape,u=c.holes;Fa.isClockWise(l)===!1&&(l=l.reverse());for(let e=0,t=u.length;e<t;e++){let t=u[e];Fa.isClockWise(t)===!0&&(u[e]=t.reverse())}let d=Fa.triangulateShape(l,u);for(let e=0,t=u.length;e<t;e++){let t=u[e];l=l.concat(t)}for(let e=0,t=l.length;e<t;e++){let t=l[e];r.push(t.x,t.y,0),i.push(0,0,1),a.push(t.x,t.y)}for(let e=0,t=d.length;e<t;e++){let t=d[e],r=t[0]+o,i=t[1]+o,a=t[2]+o;n.push(r,i,a),s+=3}}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}toJSON(){let e=super.toJSON(),t=this.parameters.shapes;return qa(t,e)}static fromJSON(t,n){let r=[];for(let e=0,i=t.shapes.length;e<i;e++){let i=n[t.shapes[e]];r.push(i)}return new e(r,t.curveSegments)}};function qa(e,t){if(t.shapes=[],Array.isArray(e))for(let n=0,r=e.length;n<r;n++){let r=e[n];t.shapes.push(r.uuid)}else t.shapes.push(e.uuid);return t}var Ja=class e extends Hn{constructor(e=1,t=32,n=16,r=0,i=Math.PI*2,a=0,o=Math.PI){super(),this.type=`SphereGeometry`,this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:r,phiLength:i,thetaStart:a,thetaLength:o},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));let s=Math.min(a+o,Math.PI),c=0,l=[],u=new V,d=new V,f=[],p=[],m=[],h=[];for(let f=0;f<=n;f++){let g=[],_=f/n,v=a+_*o,y=e*Math.cos(v),b=Math.sqrt(e*e-y*y),x=0;f===0&&a===0?x=.5/t:f===n&&s===Math.PI&&(x=-.5/t);for(let e=0;e<=t;e++){let n=e/t,a=r+n*i;u.x=-b*Math.cos(a),u.y=y,u.z=b*Math.sin(a),p.push(u.x,u.y,u.z),d.copy(u).normalize(),m.push(d.x,d.y,d.z),h.push(n+x,1-_),g.push(c++)}l.push(g)}for(let e=0;e<n;e++)for(let r=0;r<t;r++){let t=l[e][r+1],i=l[e][r],o=l[e+1][r],c=l[e+1][r+1];(e!==0||a>0)&&f.push(t,i,c),(e!==n-1||s<Math.PI)&&f.push(i,o,c)}this.setIndex(f),this.setAttribute(`position`,new W(p,3)),this.setAttribute(`normal`,new W(m,3)),this.setAttribute(`uv`,new W(h,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}},Ya=class e extends Hn{constructor(e=1,t=.4,n=12,r=48,i=Math.PI*2,a=0,o=Math.PI*2){super(),this.type=`TorusGeometry`,this.parameters={radius:e,tube:t,radialSegments:n,tubularSegments:r,arc:i,thetaStart:a,thetaLength:o},n=Math.floor(n),r=Math.floor(r);let s=[],c=[],l=[],u=[],d=new V,f=new V,p=new V;for(let s=0;s<=n;s++){let m=a+s/n*o;for(let a=0;a<=r;a++){let o=a/r*i;f.x=(e+t*Math.cos(m))*Math.cos(o),f.y=(e+t*Math.cos(m))*Math.sin(o),f.z=t*Math.sin(m),c.push(f.x,f.y,f.z),d.x=e*Math.cos(o),d.y=e*Math.sin(o),p.subVectors(f,d).normalize(),l.push(p.x,p.y,p.z),u.push(a/r),u.push(s/n)}}for(let e=1;e<=n;e++)for(let t=1;t<=r;t++){let n=(r+1)*e+t-1,i=(r+1)*(e-1)+t-1,a=(r+1)*(e-1)+t,o=(r+1)*e+t;s.push(n,i,o),s.push(i,a,o)}this.setIndex(s),this.setAttribute(`position`,new W(c,3)),this.setAttribute(`normal`,new W(l,3)),this.setAttribute(`uv`,new W(u,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.radius,t.tube,t.radialSegments,t.tubularSegments,t.arc,t.thetaStart,t.thetaLength)}},Xa=class e extends Hn{constructor(e=1,t=.4,n=64,r=8,i=2,a=3){super(),this.type=`TorusKnotGeometry`,this.parameters={radius:e,tube:t,tubularSegments:n,radialSegments:r,p:i,q:a},n=Math.floor(n),r=Math.floor(r);let o=[],s=[],c=[],l=[],u=new V,d=new V,f=new V,p=new V,m=new V,h=new V,g=new V;for(let o=0;o<=n;++o){let v=o/n*i*Math.PI*2;_(v,i,a,e,f),_(v+.01,i,a,e,p),h.subVectors(p,f),g.addVectors(p,f),m.crossVectors(h,g),g.crossVectors(m,h),m.normalize(),g.normalize();for(let e=0;e<=r;++e){let i=e/r*Math.PI*2,a=-t*Math.cos(i),p=t*Math.sin(i);u.x=f.x+(a*g.x+p*m.x),u.y=f.y+(a*g.y+p*m.y),u.z=f.z+(a*g.z+p*m.z),s.push(u.x,u.y,u.z),d.subVectors(u,f).normalize(),c.push(d.x,d.y,d.z),l.push(o/n),l.push(e/r)}}for(let e=1;e<=n;e++)for(let t=1;t<=r;t++){let n=(r+1)*(e-1)+(t-1),i=(r+1)*e+(t-1),a=(r+1)*e+t,s=(r+1)*(e-1)+t;o.push(n,i,s),o.push(i,a,s)}this.setIndex(o),this.setAttribute(`position`,new W(s,3)),this.setAttribute(`normal`,new W(c,3)),this.setAttribute(`uv`,new W(l,2));function _(e,t,n,r,i){let a=Math.cos(e),o=Math.sin(e),s=n/t*e,c=Math.cos(s);i.x=r*(2+c)*.5*a,i.y=r*(2+c)*o*.5,i.z=r*Math.sin(s)*.5}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.radius,t.tube,t.tubularSegments,t.radialSegments,t.p,t.q)}},Za=class e extends Hn{constructor(e=new Yi(new V(-1,-1,0),new V(-1,1,0),new V(1,1,0)),t=64,n=1,r=8,i=!1){super(),this.type=`TubeGeometry`,this.parameters={path:e,tubularSegments:t,radius:n,radialSegments:r,closed:i};let a=e.computeFrenetFrames(t,i);this.tangents=a.tangents,this.normals=a.normals,this.binormals=a.binormals;let o=new V,s=new V,c=new z,l=new V,u=[],d=[],f=[],p=[];m(),this.setIndex(p),this.setAttribute(`position`,new W(u,3)),this.setAttribute(`normal`,new W(d,3)),this.setAttribute(`uv`,new W(f,2));function m(){for(let e=0;e<t;e++)h(e);h(i===!1?t:0),_(),g()}function h(i){l=e.getPointAt(i/t,l);let c=a.normals[i],f=a.binormals[i];for(let e=0;e<=r;e++){let t=e/r*Math.PI*2,i=Math.sin(t),a=-Math.cos(t);s.x=a*c.x+i*f.x,s.y=a*c.y+i*f.y,s.z=a*c.z+i*f.z,s.normalize(),d.push(s.x,s.y,s.z),o.x=l.x+n*s.x,o.y=l.y+n*s.y,o.z=l.z+n*s.z,u.push(o.x,o.y,o.z)}}function g(){for(let e=1;e<=t;e++)for(let t=1;t<=r;t++){let n=(r+1)*(e-1)+(t-1),i=(r+1)*e+(t-1),a=(r+1)*e+t,o=(r+1)*(e-1)+t;p.push(n,i,o),p.push(i,a,o)}}function _(){for(let e=0;e<=t;e++)for(let n=0;n<=r;n++)c.x=e/t,c.y=n/r,f.push(c.x,c.y)}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}toJSON(){let e=super.toJSON();return e.path=this.parameters.path.toJSON(),e}static fromJSON(t){return new e(new Zi[t.path.type]().fromJSON(t.path),t.tubularSegments,t.radius,t.radialSegments,t.closed)}};function Qa(e){let t={};for(let n in e){t[n]={};for(let r in e[n]){let i=e[n][r];if(eo(i))i.isRenderTargetTexture?(F(`UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms().`),t[n][r]=null):t[n][r]=i.clone();else if(Array.isArray(i)){if(eo(i[0])){let e=[];for(let t=0,n=i.length;t<n;t++)e[t]=i[t].clone();t[n][r]=e}else t[n][r]=i.slice()}else t[n][r]=i}}return t}function $a(e){let t={};for(let n=0;n<e.length;n++){let r=Qa(e[n]);for(let e in r)t[e]=r[e]}return t}function eo(e){return e&&(e.isColor||e.isMatrix3||e.isMatrix4||e.isVector2||e.isVector3||e.isVector4||e.isTexture||e.isQuaternion)}function to(e){let t=[];for(let n=0;n<e.length;n++)t.push(e[n].clone());return t}function no(e){let t=e.getRenderTarget();return t===null?e.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:Xe.workingColorSpace}var ro={clone:Qa,merge:$a},io=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,ao=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,oo=class extends Zn{constructor(e){super(),this.isShaderMaterial=!0,this.type=`ShaderMaterial`,this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=io,this.fragmentShader=ao,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Qa(e.uniforms),this.uniformsGroups=to(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){let t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(let n in this.uniforms){let r=this.uniforms[n].value;r&&r.isTexture?t.uniforms[n]={type:`t`,value:r.toJSON(e).uuid}:r&&r.isColor?t.uniforms[n]={type:`c`,value:r.getHex()}:r&&r.isVector2?t.uniforms[n]={type:`v2`,value:r.toArray()}:r&&r.isVector3?t.uniforms[n]={type:`v3`,value:r.toArray()}:r&&r.isVector4?t.uniforms[n]={type:`v4`,value:r.toArray()}:r&&r.isMatrix3?t.uniforms[n]={type:`m3`,value:r.toArray()}:r&&r.isMatrix4?t.uniforms[n]={type:`m4`,value:r.toArray()}:t.uniforms[n]={value:r}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;let n={};for(let e in this.extensions)this.extensions[e]===!0&&(n[e]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}fromJSON(e,t){if(super.fromJSON(e,t),e.uniforms!==void 0)for(let n in e.uniforms){let r=e.uniforms[n];switch(this.uniforms[n]={},r.type){case`t`:this.uniforms[n].value=t[r.value]||null;break;case`c`:this.uniforms[n].value=new U().setHex(r.value);break;case`v2`:this.uniforms[n].value=new z().fromArray(r.value);break;case`v3`:this.uniforms[n].value=new V().fromArray(r.value);break;case`v4`:this.uniforms[n].value=new st().fromArray(r.value);break;case`m3`:this.uniforms[n].value=new Ge().fromArray(r.value);break;case`m4`:this.uniforms[n].value=new ft().fromArray(r.value);break;default:this.uniforms[n].value=r.value}}if(e.defines!==void 0&&(this.defines=e.defines),e.vertexShader!==void 0&&(this.vertexShader=e.vertexShader),e.fragmentShader!==void 0&&(this.fragmentShader=e.fragmentShader),e.glslVersion!==void 0&&(this.glslVersion=e.glslVersion),e.extensions!==void 0)for(let t in e.extensions)this.extensions[t]=e.extensions[t];return e.lights!==void 0&&(this.lights=e.lights),e.clipping!==void 0&&(this.clipping=e.clipping),this}},so=class extends oo{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type=`RawShaderMaterial`}},co=class extends Zn{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type=`MeshStandardMaterial`,this.defines={STANDARD:``},this.color=new U(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new U(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new z(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new St,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap=`round`,this.wireframeLinejoin=`round`,this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:``},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}},lo=class extends co{constructor(e){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:``,PHYSICAL:``},this.type=`MeshPhysicalMaterial`,this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new z(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return I(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(e){this.ior=(1+.4*e)/(1-.4*e)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new U(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new U(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new U(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._retroreflectivity=0,this._sheen=0,this._transmission=0,this.setValues(e)}get anisotropy(){return this._anisotropy}set anisotropy(e){this._anisotropy>0!=e>0&&this.version++,this._anisotropy=e}get clearcoat(){return this._clearcoat}set clearcoat(e){this._clearcoat>0!=e>0&&this.version++,this._clearcoat=e}get iridescence(){return this._iridescence}set iridescence(e){this._iridescence>0!=e>0&&this.version++,this._iridescence=e}get dispersion(){return this._dispersion}set dispersion(e){this._dispersion>0!=e>0&&this.version++,this._dispersion=e}get retroreflectivity(){return this._retroreflectivity}set retroreflectivity(e){this._retroreflectivity>0!=e>0&&this.version++,this._retroreflectivity=e}get sheen(){return this._sheen}set sheen(e){this._sheen>0!=e>0&&this.version++,this._sheen=e}get transmission(){return this._transmission}set transmission(e){this._transmission>0!=e>0&&this.version++,this._transmission=e}copy(e){return super.copy(e),this.defines={STANDARD:``,PHYSICAL:``},this.anisotropy=e.anisotropy,this.anisotropyRotation=e.anisotropyRotation,this.anisotropyMap=e.anisotropyMap,this.clearcoat=e.clearcoat,this.clearcoatMap=e.clearcoatMap,this.clearcoatRoughness=e.clearcoatRoughness,this.clearcoatRoughnessMap=e.clearcoatRoughnessMap,this.clearcoatNormalMap=e.clearcoatNormalMap,this.clearcoatNormalScale.copy(e.clearcoatNormalScale),this.dispersion=e.dispersion,this.ior=e.ior,this.iridescence=e.iridescence,this.iridescenceMap=e.iridescenceMap,this.iridescenceIOR=e.iridescenceIOR,this.iridescenceThicknessRange=[...e.iridescenceThicknessRange],this.iridescenceThicknessMap=e.iridescenceThicknessMap,this.retroreflectivity=e.retroreflectivity,this.sheen=e.sheen,this.sheenColor.copy(e.sheenColor),this.sheenColorMap=e.sheenColorMap,this.sheenRoughness=e.sheenRoughness,this.sheenRoughnessMap=e.sheenRoughnessMap,this.transmission=e.transmission,this.transmissionMap=e.transmissionMap,this.thickness=e.thickness,this.thicknessMap=e.thicknessMap,this.attenuationDistance=e.attenuationDistance,this.attenuationColor.copy(e.attenuationColor),this.specularIntensity=e.specularIntensity,this.specularIntensityMap=e.specularIntensityMap,this.specularColor.copy(e.specularColor),this.specularColorMap=e.specularColorMap,this}},uo=class extends Zn{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type=`MeshDepthMaterial`,this.depthPacking=3200,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}},fo=class extends Zn{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type=`MeshDistanceMaterial`,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}};function po(e,t){return!e||e.constructor===t?e:typeof t.BYTES_PER_ELEMENT==`number`?new t(e):Array.prototype.slice.call(e)}function mo(e){return e!==void 0&&e.inTangents!==void 0&&e.outTangents!==void 0}function ho(e){function t(t,n){return e[t]-e[n]}let n=e.length,r=Array(n);for(let e=0;e!==n;++e)r[e]=e;return r.sort(t),r}function go(e,t,n){let r=e.length,i=new e.constructor(r);for(let a=0,o=0;o!==r;++a){let r=n[a]*t;for(let n=0;n!==t;++n)i[o++]=e[r+n]}return i}function _o(e,t,n,r){let i=1,a=e[0];for(;a!==void 0&&a[r]===void 0;)a=e[i++];if(a===void 0)return;let o=a[r];if(o!==void 0){if(Array.isArray(o))do o=a[r],o!==void 0&&(t.push(a.time),n.push(...o)),a=e[i++];while(a!==void 0);else if(o.toArray!==void 0)do o=a[r],o!==void 0&&(t.push(a.time),o.toArray(n,n.length)),a=e[i++];while(a!==void 0);else do o=a[r],o!==void 0&&(t.push(a.time),n.push(o)),a=e[i++];while(a!==void 0)}}function vo(e,t,n,r,i=30){let a=e.clone();a.name=t;let o=[];for(let e=0;e<a.tracks.length;++e){let t=a.tracks[e],s=t.getValueSize(),c=[],l=[];for(let e=0;e<t.times.length;++e){let a=t.times[e]*i;if(!(a<n||a>=r)){c.push(t.times[e]);for(let n=0;n<s;++n)l.push(t.values[e*s+n])}}c.length!==0&&(t.times=po(c,t.times.constructor),t.values=po(l,t.values.constructor),o.push(t))}a.tracks=o;let s=1/0;for(let e=0;e<a.tracks.length;++e)s>a.tracks[e].times[0]&&(s=a.tracks[e].times[0]);for(let e=0;e<a.tracks.length;++e)a.tracks[e].shift(-1*s);return a.resetDuration(),a}function yo(e,t=0,n=e,r=30){r<=0&&(r=30);let i=n.tracks.length,a=t/r;for(let t=0;t<i;++t){let r=n.tracks[t],i=r.ValueTypeName;if(i===`bool`||i===`string`)continue;let o=e.tracks.find(function(e){return e.name===r.name&&e.ValueTypeName===i});if(o===void 0)continue;let s=0,c=r.getValueSize();r.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline&&(s=c/3);let l=0,u=o.getValueSize();o.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline&&(l=u/3);let d=r.times.length-1,f;if(a<=r.times[0]){let e=s,t=c-s;f=r.values.slice(e,t)}else if(a>=r.times[d]){let e=d*c+s,t=e+c-s;f=r.values.slice(e,t)}else{let e=r.createInterpolant(),t=s,n=c-s;e.evaluate(a),f=e.resultBuffer.slice(t,n)}i===`quaternion`&&new B().fromArray(f).normalize().conjugate().toArray(f);let p=o.times.length;for(let e=0;e<p;++e){let t=e*u+l;if(i===`quaternion`)B.multiplyQuaternionsFlat(o.values,t,f,0,o.values,t);else{let e=u-l*2;for(let n=0;n<e;++n)o.values[t+n]-=f[n]}}}return e.blendMode=ee,e}var bo=class{static convertArray(e,t){return po(e,t)}static isTypedArray(e){return ce(e)}static hasTangents(e){return mo(e)}static getKeyframeOrder(e){return ho(e)}static sortedArray(e,t,n){return go(e,t,n)}static flattenJSON(e,t,n,r){_o(e,t,n,r)}static subclip(e,t,n,r,i=30){return vo(e,t,n,r,i)}static makeClipAdditive(e,t=0,n=e,r=30){return yo(e,t,n,r)}},xo=class{constructor(e,t,n,r){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=r===void 0?new t.constructor(n):r,this.sampleValues=t,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(e){let t=this.parameterPositions,n=this._cachedIndex,r=t[n],i=t[n-1];validate_interval:{seek:{let a;linear_scan:{forward_scan:if(!(e<r)){for(let a=n+2;;){if(r===void 0){if(e<i)break forward_scan;return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===a)break;if(i=r,r=t[++n],e<r)break seek}a=t.length;break linear_scan}if(!(e>=i)){let o=t[1];e<o&&(n=2,i=o);for(let a=n-2;;){if(i===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===a)break;if(r=i,i=t[--n-1],e>=i)break seek}a=n,n=0;break linear_scan}break validate_interval}for(;n<a;){let r=n+a>>>1;e<t[r]?a=r:n=r+1}if(r=t[n],i=t[n-1],i===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(r===void 0)return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,i,r)}return this.interpolate_(n,i,e,r)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){let t=this.resultBuffer,n=this.sampleValues,r=this.valueSize,i=e*r;for(let e=0;e!==r;++e)t[e]=n[i+e];return t}interpolate_(){throw Error(`THREE.Interpolant: Call to abstract method.`)}intervalChanged_(){}},So=class extends xo{constructor(e,t,n,r){super(e,t,n,r),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:k,endingEnd:k}}intervalChanged_(e,t,n){let r=this.parameterPositions,i=e-2,a=e+1,o=r[i],s=r[a];if(o===void 0)switch(this.getSettings_().endingStart){case A:i=e,o=2*t-n;break;case j:i=r.length-2,o=t+r[i]-r[i+1];break;default:i=e,o=n}if(s===void 0)switch(this.getSettings_().endingEnd){case A:a=e,s=2*n-t;break;case j:a=1,s=n+r[1]-r[0];break;default:a=e-1,s=t}let c=(n-t)*.5,l=this.valueSize;this._weightPrev=c/(t-o),this._weightNext=c/(s-n),this._offsetPrev=i*l,this._offsetNext=a*l}interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=e*o,c=s-o,l=this._offsetPrev,u=this._offsetNext,d=this._weightPrev,f=this._weightNext,p=(n-t)/(r-t),m=p*p,h=m*p,g=-d*h+2*d*m-d*p,_=(1+d)*h+(-1.5-2*d)*m+(-.5+d)*p+1,v=(-1-f)*h+(1.5+f)*m+.5*p,y=f*h-f*m;for(let e=0;e!==o;++e)i[e]=g*a[l+e]+_*a[c+e]+v*a[s+e]+y*a[u+e];return i}},Co=class extends xo{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=e*o,c=s-o,l=(n-t)/(r-t),u=1-l;for(let e=0;e!==o;++e)i[e]=a[c+e]*u+a[s+e]*l;return i}},wo=class extends xo{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e){return this.copySampleValue_(e-1)}},To=class extends xo{interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=e*o,c=s-o,l=this.inTangents,u=this.outTangents;if(!l||!u){let e=(n-t)/(r-t),l=1-e;for(let t=0;t!==o;++t)i[t]=a[c+t]*l+a[s+t]*e;return i}let d=o*2,f=e-1;for(let p=0;p!==o;++p){let o=a[c+p],m=a[s+p],h=f*d+p*2,g=u[h],_=u[h+1],v=e*d+p*2,y=l[v],b=l[v+1],x=Oo(n,t,g,y,r);i[p]=Eo(x,o,_,b,m)}return i}};function Eo(e,t,n,r,i){let a=1-e;return a*a*a*t+3*a*a*e*n+3*a*e*e*r+e*e*e*i}function Do(e,t,n,r,i){let a=1-e;return 3*a*a*(n-t)+6*a*e*(r-n)+3*e*e*(i-r)}function Oo(e,t,n,r,i){let a=(e-t)/(i-t);for(let o=0;o<8;o++){let o=Eo(a,t,n,r,i)-e;if(Math.abs(o)<1e-10)break;let s=Do(a,t,n,r,i);if(Math.abs(s)<1e-10)break;a=Math.max(0,Math.min(1,a-o/s))}return a}var ko=class{constructor(e,t,n,r){if(e===void 0)throw Error(`THREE.KeyframeTrack: track name is undefined`);if(t===void 0||t.length===0)throw Error(`THREE.KeyframeTrack: no keyframes in track named `+e);this.name=e,this.times=po(t,this.TimeBufferType),this.values=po(n,this.ValueBufferType),this.setInterpolation(r||this.DefaultInterpolation)}static toJSON(e){let t=e.constructor,n;if(t.toJSON!==this.toJSON)n=t.toJSON(e);else{n={name:e.name,times:po(e.times,Array),values:po(e.values,Array)};let t=e.getInterpolation();t!==e.DefaultInterpolation&&(n.interpolation=t),mo(e.settings)&&(n.settings={inTangents:po(e.settings.inTangents,Array),outTangents:po(e.settings.outTangents,Array)})}return n.type=e.ValueTypeName,n}InterpolantFactoryMethodDiscrete(e){return new wo(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new Co(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new So(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodBezier(e){let t=new To(this.times,this.values,this.getValueSize(),e);return this.settings&&(t.inTangents=this.settings.inTangents,t.outTangents=this.settings.outTangents),t}setInterpolation(e){let t;switch(e){case T:t=this.InterpolantFactoryMethodDiscrete;break;case E:t=this.InterpolantFactoryMethodLinear;break;case D:t=this.InterpolantFactoryMethodSmooth;break;case O:t=this.InterpolantFactoryMethodBezier}if(t===void 0){let t=`unsupported interpolation for `+this.ValueTypeName+` keyframe track named `+this.name;if(this.createInterpolant===void 0){if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw Error(t)}return F(`KeyframeTrack:`,t),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return T;case this.InterpolantFactoryMethodLinear:return E;case this.InterpolantFactoryMethodSmooth:return D;case this.InterpolantFactoryMethodBezier:return O}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){let t=this.times;for(let n=0,r=t.length;n!==r;++n)t[n]+=e}return this}scale(e){if(e!==1){let t=this.times;for(let n=0,r=t.length;n!==r;++n)t[n]*=e;mo(this.settings)&&(Ao(this.settings.inTangents,e),Ao(this.settings.outTangents,e))}return this}trim(e,t){let n=this.times,r=n.length,i=0,a=r-1;for(;i!==r&&n[i]<e;)++i;for(;a!==-1&&n[a]>t;)--a;if(++a,i!==0||a!==r){i>=a&&(a=Math.max(a,1),i=a-1);let e=this.getValueSize();this.times=n.slice(i,a),this.values=this.values.slice(i*e,a*e)}return this}validate(){let e=!0,t=this.getValueSize();t-Math.floor(t)!==0&&(me(`KeyframeTrack: Invalid value size in track.`,this),e=!1);let n=this.times,r=this.values,i=n.length;i===0&&(me(`KeyframeTrack: Track is empty.`,this),e=!1);let a=null;for(let t=0;t!==i;t++){let r=n[t];if(typeof r==`number`&&isNaN(r)){me(`KeyframeTrack: Time is not a valid number.`,this,t,r),e=!1;break}if(a!==null&&a>r){me(`KeyframeTrack: Out of order keys.`,this,t,r,a),e=!1;break}a=r}if(r!==void 0&&ce(r))for(let t=0,n=r.length;t!==n;++t){let n=r[t];if(isNaN(n)){me(`KeyframeTrack: Value is not a valid number.`,this,t,n),e=!1;break}}return e}optimize(){let e=this.times.slice(),t=this.values.slice(),n=this.getValueSize(),r=this.getInterpolation()===D,i=e.length-1,a=1;for(let o=1;o<i;++o){let i=!1,s=e[o];if(s!==e[o+1]&&(o!==1||s!==e[0])){if(r)i=!0;else{let e=o*n,r=e-n,a=e+n;for(let o=0;o!==n;++o){let n=t[e+o];if(n!==t[r+o]||n!==t[a+o]){i=!0;break}}}}if(i){if(o!==a){e[a]=e[o];let r=o*n,i=a*n;for(let e=0;e!==n;++e)t[i+e]=t[r+e]}++a}}if(i>0){e[a]=e[i];for(let e=i*n,r=a*n,o=0;o!==n;++o)t[r+o]=t[e+o];++a}return a===e.length?(this.times=e,this.values=t):(this.times=e.slice(0,a),this.values=t.slice(0,a*n)),this}clone(){let e=this.times.slice(),t=this.values.slice(),n=this.constructor,r=new n(this.name,e,t);return r.createInterpolant=this.createInterpolant,mo(this.settings)&&(r.settings={inTangents:this.settings.inTangents.slice(),outTangents:this.settings.outTangents.slice()}),r}};function Ao(e,t){for(let n=0,r=e.length;n!==r;n+=2)e[n]*=t}ko.prototype.ValueTypeName=``,ko.prototype.TimeBufferType=Float32Array,ko.prototype.ValueBufferType=Float32Array,ko.prototype.DefaultInterpolation=E;var jo=class extends ko{constructor(e,t,n){super(e,t,n)}};jo.prototype.ValueTypeName=`bool`,jo.prototype.ValueBufferType=Array,jo.prototype.DefaultInterpolation=T,jo.prototype.InterpolantFactoryMethodLinear=void 0,jo.prototype.InterpolantFactoryMethodSmooth=void 0;var Mo=class extends ko{constructor(e,t,n,r){super(e,t,n,r)}};Mo.prototype.ValueTypeName=`color`;var No=class extends ko{constructor(e,t,n,r){super(e,t,n,r)}};No.prototype.ValueTypeName=`number`;var Po=class extends xo{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=(n-t)/(r-t),c=e*o;for(let e=c+o;c!==e;c+=4)B.slerpFlat(i,0,a,c-o,a,c,s);return i}},Fo=class extends ko{constructor(e,t,n,r){super(e,t,n,r)}InterpolantFactoryMethodLinear(e){return new Po(this.times,this.values,this.getValueSize(),e)}};Fo.prototype.ValueTypeName=`quaternion`,Fo.prototype.InterpolantFactoryMethodSmooth=void 0;var Io=class extends ko{constructor(e,t,n){super(e,t,n)}};Io.prototype.ValueTypeName=`string`,Io.prototype.ValueBufferType=Array,Io.prototype.DefaultInterpolation=T,Io.prototype.InterpolantFactoryMethodLinear=void 0,Io.prototype.InterpolantFactoryMethodSmooth=void 0;var Lo=class extends ko{constructor(e,t,n,r){super(e,t,n,r)}};Lo.prototype.ValueTypeName=`vector`;var Ro=class{constructor(e=``,t=-1,n=[],r=M){this.name=e,this.tracks=n,this.duration=t,this.blendMode=r,this.uuid=Ce(),this.userData={},this.duration<0&&this.resetDuration()}static parse(e){let t=[],n=e.tracks,r=1/(e.fps||1);for(let e=0,i=n.length;e!==i;++e)t.push(Bo(n[e]).scale(r));let i=new this(e.name,e.duration,t,e.blendMode);return i.uuid=e.uuid,i.userData=JSON.parse(e.userData||`{}`),i}static toJSON(e){let t=[],n=e.tracks,r={name:e.name,duration:e.duration,tracks:t,uuid:e.uuid,blendMode:e.blendMode,userData:JSON.stringify(e.userData)};for(let e=0,r=n.length;e!==r;++e)t.push(ko.toJSON(n[e]));return r}static CreateFromMorphTargetSequence(e,t,n,r){let i=t.length,a=[];for(let e=0;e<i;e++){let o=[],s=[];o.push((e+i-1)%i,e,(e+1)%i),s.push(0,1,0);let c=ho(o);o=go(o,1,c),s=go(s,1,c),!r&&o[0]===0&&(o.push(i),s.push(s[0])),a.push(new No(`.morphTargetInfluences[`+t[e].name+`]`,o,s).scale(1/n))}return new this(e,-1,a)}static findByName(e,t){let n=e;if(!Array.isArray(e)){let t=e;n=t.geometry&&t.geometry.animations||t.animations}for(let e=0;e<n.length;e++)if(n[e].name===t)return n[e];return null}static CreateClipsFromMorphTargetSequences(e,t,n){let r={},i=/^([\w-]*?)([\d]+)$/;for(let t=0,n=e.length;t<n;t++){let n=e[t],a=n.name.match(i);if(a&&a.length>1){let e=a[1],t=r[e];t||(r[e]=t=[]),t.push(n)}}let a=[];for(let e in r)a.push(this.CreateFromMorphTargetSequence(e,r[e],t,n));return a}resetDuration(){let e=this.tracks,t=0;for(let n=0,r=e.length;n!==r;++n){let e=this.tracks[n];t=Math.max(t,e.times[e.times.length-1])}return this.duration=t,this}trim(){for(let e=0;e<this.tracks.length;e++)this.tracks[e].trim(0,this.duration);return this}validate(){let e=!0;for(let t=0;t<this.tracks.length;t++)e&&=this.tracks[t].validate();return e}optimize(){for(let e=0;e<this.tracks.length;e++)this.tracks[e].optimize();return this}clone(){let e=[];for(let t=0;t<this.tracks.length;t++)e.push(this.tracks[t].clone());let t=new this.constructor(this.name,this.duration,e,this.blendMode);return t.userData=JSON.parse(JSON.stringify(this.userData)),t}toJSON(){return this.constructor.toJSON(this)}};function zo(e){switch(e.toLowerCase()){case`scalar`:case`double`:case`float`:case`number`:case`integer`:return No;case`vector`:case`vector2`:case`vector3`:case`vector4`:return Lo;case`color`:return Mo;case`quaternion`:return Fo;case`bool`:case`boolean`:return jo;case`string`:return Io}throw Error(`THREE.KeyframeTrack: Unsupported typeName: `+e)}function Bo(e){if(e.type===void 0)throw Error(`THREE.KeyframeTrack: track type undefined, can not parse`);let t=zo(e.type);if(e.times===void 0){let t=[],n=[];_o(e.keys,t,n,`value`),e.times=t,e.values=n}let n;return n=t.parse===void 0?new t(e.name,e.times,e.values,e.interpolation):t.parse(e),mo(e.settings)&&(n.settings={inTangents:po(e.settings.inTangents,Float32Array),outTangents:po(e.settings.outTangents,Float32Array)}),n}var Vo={enabled:!1,files:{},add:function(e,t){this.enabled!==!1&&(Ho(e)||(this.files[e]=t))},get:function(e){if(this.enabled!==!1&&!Ho(e))return this.files[e]},remove:function(e){delete this.files[e]},clear:function(){this.files={}}};function Ho(e){try{let t=e.slice(e.indexOf(`:`)+1);return new URL(t).protocol===`blob:`}catch{return!1}}var Uo=new class{constructor(e,t,n){let r=this,i=!1,a=0,o=0,s,c=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=n,this._abortController=null,this.itemStart=function(e){o++,i===!1&&r.onStart!==void 0&&r.onStart(e,a,o),i=!0},this.itemEnd=function(e){a++,r.onProgress!==void 0&&r.onProgress(e,a,o),a===o&&(i=!1,r.onLoad!==void 0&&r.onLoad())},this.itemError=function(e){r.onError!==void 0&&r.onError(e)},this.resolveURL=function(e){return e=e.normalize(`NFC`),s?s(e):e},this.setURLModifier=function(e){return s=e,this},this.addHandler=function(e,t){return c.push(e,t),this},this.removeHandler=function(e){let t=c.indexOf(e);return t!==-1&&c.splice(t,2),this},this.getHandler=function(e){for(let t=0,n=c.length;t<n;t+=2){let n=c[t],r=c[t+1];if(n.global&&(n.lastIndex=0),n.test(e))return r}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||=new AbortController,this._abortController}},Wo=class{constructor(e){this.manager=e===void 0?Uo:e,this.crossOrigin=`anonymous`,this.withCredentials=!1,this.path=``,this.resourcePath=``,this.requestHeader={},typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`observe`,{detail:this}))}load(){}loadAsync(e,t){let n=this;return new Promise(function(r,i){n.load(e,r,t,i)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}};Wo.DEFAULT_MATERIAL_NAME=`__DEFAULT`;var Go={},Ko=class extends Error{constructor(e,t){super(e),this.response=t}},qo=class extends Wo{constructor(e){super(e),this.mimeType=``,this.responseType=``,this._abortController=new AbortController}load(e,t,n,r){e===void 0&&(e=``),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);let i=Vo.get(`file:${e}`);if(i!==void 0){this.manager.itemStart(e),setTimeout(()=>{t&&t(i),this.manager.itemEnd(e)},0);return}if(Go[e]!==void 0){Go[e].push({onLoad:t,onProgress:n,onError:r});return}Go[e]=[],Go[e].push({onLoad:t,onProgress:n,onError:r});let a=new Request(e,{headers:new Headers(this.requestHeader),credentials:this.withCredentials?`include`:`same-origin`,signal:typeof AbortSignal.any==`function`?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal}),o=this.mimeType,s=this.responseType;fetch(a).then(t=>{if(t.status===200||t.status===0){if(t.status===0&&F(`FileLoader: HTTP Status 0 received.`),typeof ReadableStream>`u`||t.body===void 0||t.body.getReader===void 0)return t;let n=Go[e],r=t.body.getReader(),i=t.headers.get(`X-File-Size`)||t.headers.get(`Content-Length`),a=i?parseInt(i):0,o=a!==0,s=0,c=new ReadableStream({start(e){t();function t(){r.read().then(({done:r,value:i})=>{if(r)e.close();else{s+=i.byteLength;let r=new ProgressEvent(`progress`,{lengthComputable:o,loaded:s,total:a});for(let e=0,t=n.length;e<t;e++){let t=n[e];t.onProgress&&t.onProgress(r)}e.enqueue(i),t()}},t=>{e.error(t)})}}});return new Response(c)}throw new Ko(`fetch for "${t.url}" responded with ${t.status}: ${t.statusText}`,t)}).then(e=>{switch(s){case`arraybuffer`:return e.arrayBuffer();case`blob`:return e.blob();case`document`:return e.text().then(e=>new DOMParser().parseFromString(e,o));case`json`:return e.json();default:if(o===``)return e.text();{let t=/charset="?([^;"\s]*)"?/i.exec(o),n=t&&t[1]?t[1].toLowerCase():void 0,r=new TextDecoder(n);return e.arrayBuffer().then(e=>r.decode(e))}}}).then(t=>{Vo.add(`file:${e}`,t);let n=Go[e];delete Go[e];for(let e=0,r=n.length;e<r;e++){let r=n[e];r.onLoad&&r.onLoad(t)}}).catch(t=>{let n=Go[e];if(n===void 0)throw this.manager.itemError(e),t;delete Go[e];for(let e=0,r=n.length;e<r;e++){let r=n[e];r.onError&&r.onError(t)}this.manager.itemError(e)}).finally(()=>{this.manager.itemEnd(e)}),this.manager.itemStart(e)}setResponseType(e){return this.responseType=e,this}setMimeType(e){return this.mimeType=e,this}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}},Jo=new WeakMap,Yo=class extends Wo{constructor(e){super(e)}load(e,t,n,r){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);let i=this,a=Vo.get(`image:${e}`);if(a!==void 0){if(a.complete===!0)i.manager.itemStart(e),setTimeout(function(){t&&t(a),i.manager.itemEnd(e)},0);else{let e=Jo.get(a);e===void 0&&(e=[],Jo.set(a,e)),e.push({onLoad:t,onError:r})}return a}let o=le(`img`);function s(){l(),t&&t(this);let n=Jo.get(this)||[];for(let e=0;e<n.length;e++){let t=n[e];t.onLoad&&t.onLoad(this)}Jo.delete(this),i.manager.itemEnd(e)}function c(t){l(),r&&r(t),Vo.remove(`image:${e}`);let n=Jo.get(this)||[];for(let e=0;e<n.length;e++){let r=n[e];r.onError&&r.onError(t)}Jo.delete(this),i.manager.itemError(e),i.manager.itemEnd(e)}function l(){o.removeEventListener(`load`,s,!1),o.removeEventListener(`error`,c,!1)}return o.addEventListener(`load`,s,!1),o.addEventListener(`error`,c,!1),e.slice(0,5)!==`data:`&&this.crossOrigin!==void 0&&(o.crossOrigin=this.crossOrigin),Vo.add(`image:${e}`,o),i.manager.itemStart(e),o.src=e,o}},Xo=class extends Wo{constructor(e){super(e)}load(e,t,n,r){let i=new ot,a=new Yo(this.manager);return a.setCrossOrigin(this.crossOrigin),a.setPath(this.path),a.load(e,function(e){i.image=e,i.needsUpdate=!0,t!==void 0&&t(i)},n,r),i}},Zo=class extends zt{constructor(e,t=1){super(),this.isLight=!0,this.type=`Light`,this.color=new U(e),this.intensity=t}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){let t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,t}},Qo=class extends Zo{constructor(e,t,n){super(e,n),this.isHemisphereLight=!0,this.type=`HemisphereLight`,this.position.copy(zt.DEFAULT_UP),this.updateMatrix(),this.groundColor=new U(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}toJSON(e){let t=super.toJSON(e);return t.object.groundColor=this.groundColor.getHex(),t}},$o=new ft,es=new V,ts=new V,ns=class{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new z(512,512),this.mapType=l,this.map=null,this.mapPass=null,this.matrix=new ft,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Wr,this._frameExtents=new z(1,1),this._viewportCount=1,this._viewports=[new st(0,0,1,1)]}getViewportCount(){return this._viewportCount}getCamera(){return this.camera}getFrustum(){return this._frustum}updateMatrices(e){let t=this.camera;es.setFromMatrixPosition(e.matrixWorld),t.position.copy(es),ts.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(ts),t.updateMatrixWorld(),this._updateMatrix(t,this.matrix,this._frustum)}_updateMatrix(e,t,n,r){$o.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),n.setFromProjectionMatrix($o,e.coordinateSystem,e.reversedDepth);let i=this._frameExtents,a=r?r.z/i.x:1,o=r?r.w/i.y:1,s=r?r.x/i.x:0,c=r?r.y/i.y:0;e.coordinateSystem===2001||e.reversedDepth?t.set(.5*a,0,0,.5*a+s,0,.5*o,0,.5*o+c,0,0,1,0,0,0,0,1):t.set(.5*a,0,0,.5*a+s,0,.5*o,0,.5*o+c,0,0,.5,.5,0,0,0,1),t.multiply($o)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this.biasNode=e.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){let e={};return e.intensity=this.intensity,e.bias=this.bias,e.normalBias=this.normalBias,e.radius=this.radius,e.blurSamples=this.blurSamples,e.mapSize=this.mapSize.toArray(),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}},rs=new V,is=new B,as=new V,os=class extends zt{constructor(){super(),this.isCamera=!0,this.type=`Camera`,this.matrixWorldInverse=new ft,this.projectionMatrix=new ft,this.projectionMatrixInverse=new ft,this.coordinateSystem=oe,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(rs,is,as),as.x===1&&as.y===1&&as.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(rs,is,as.set(1,1,1)).invert()}updateWorldMatrix(e,t,n=!1){super.updateWorldMatrix(e,t,n),this.matrixWorld.decompose(rs,is,as),as.x===1&&as.y===1&&as.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(rs,is,as.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}},ss=new V,cs=new z,ls=new z,us=class extends os{constructor(e=50,t=1,n=.1,r=2e3){super(),this.isPerspectiveCamera=!0,this.type=`PerspectiveCamera`,this.fov=e,this.zoom=1,this.near=n,this.far=r,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){let t=.5*this.getFilmHeight()/e;this.fov=Se*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){let e=Math.tan(xe*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return Se*2*Math.atan(Math.tan(xe*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){ss.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(ss.x,ss.y).multiplyScalar(-e/ss.z),ss.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(ss.x,ss.y).multiplyScalar(-e/ss.z)}getViewSize(e,t){return this.getViewBounds(e,cs,ls),t.subVectors(ls,cs)}setViewOffset(e,t,n,r,i,a){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=r,this.view.width=i,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=this.near,t=e*Math.tan(xe*.5*this.fov)/this.zoom,n=2*t,r=this.aspect*n,i=-.5*r,a=this.view;if(this.view!==null&&this.view.enabled){let e=a.fullWidth,o=a.fullHeight;i+=a.offsetX*r/e,t-=a.offsetY*n/o,r*=a.width/e,n*=a.height/o}let o=this.filmOffset;o!==0&&(i+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(i,i+r,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}},ds=class extends ns{constructor(){super(new us(50,1,.5,500)),this.isSpotLightShadow=!0,this.focus=1,this.aspect=1}updateMatrices(e){let t=this.camera,n=Se*2*e.angle*this.focus,r=this.mapSize.width/this.mapSize.height*this.aspect,i=e.distance||t.far;(n!==t.fov||r!==t.aspect||i!==t.far)&&(t.fov=n,t.aspect=r,t.far=i,t.updateProjectionMatrix()),super.updateMatrices(e)}copy(e){return super.copy(e),this.focus=e.focus,this.aspect=e.aspect,this}toJSON(){let e=super.toJSON();return e.focus=this.focus,e.aspect=this.aspect,e}},fs=class extends Zo{constructor(e,t,n=0,r=Math.PI/3,i=0,a=2){super(e,t),this.isSpotLight=!0,this.type=`SpotLight`,this.position.copy(zt.DEFAULT_UP),this.updateMatrix(),this.target=new zt,this.distance=n,this.angle=r,this.penumbra=i,this.decay=a,this.map=null,this.shadow=new ds}get power(){return this.intensity*Math.PI}set power(e){this.intensity=e/Math.PI}dispose(){super.dispose(),this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.angle=e.angle,this.penumbra=e.penumbra,this.decay=e.decay,this.target=e.target.clone(),this.map=e.map,this.shadow=e.shadow.clone(),this}toJSON(e){let t=super.toJSON(e);return t.object.distance=this.distance,t.object.angle=this.angle,t.object.decay=this.decay,t.object.penumbra=this.penumbra,t.object.target=this.target.uuid,this.map&&this.map.isTexture&&(t.object.map=this.map.toJSON(e).uuid),t.object.shadow=this.shadow.toJSON(),t}},ps=class extends ns{constructor(){super(new us(90,1,.5,500)),this.isPointLightShadow=!0}},ms=class extends Zo{constructor(e,t,n=0,r=2){super(e,t),this.isPointLight=!0,this.type=`PointLight`,this.distance=n,this.decay=r,this.shadow=new ps}get power(){return this.intensity*4*Math.PI}set power(e){this.intensity=e/(4*Math.PI)}dispose(){super.dispose(),this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.decay=e.decay,this.shadow=e.shadow.clone(),this}toJSON(e){let t=super.toJSON(e);return t.object.distance=this.distance,t.object.decay=this.decay,t.object.shadow=this.shadow.toJSON(),t}},hs=class extends os{constructor(e=-1,t=1,n=1,r=-1,i=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type=`OrthographicCamera`,this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=r,this.near=i,this.far=a,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,r,i,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=r,this.view.width=i,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,r=(this.top+this.bottom)/2,i=n-e,a=n+e,o=r+t,s=r-t;if(this.view!==null&&this.view.enabled){let e=(this.right-this.left)/this.view.fullWidth/this.zoom,t=(this.top-this.bottom)/this.view.fullHeight/this.zoom;i+=e*this.view.offsetX,a=i+e*this.view.width,o-=t*this.view.offsetY,s=o-t*this.view.height}this.projectionMatrix.makeOrthographic(i,a,o,s,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}},gs=class extends ns{constructor(){super(new hs(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}},_s=class extends Zo{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type=`DirectionalLight`,this.position.copy(zt.DEFAULT_UP),this.updateMatrix(),this.target=new zt,this.shadow=new gs}dispose(){super.dispose(),this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}toJSON(e){let t=super.toJSON(e);return t.object.shadow=this.shadow.toJSON(),t.object.target=this.target.uuid,t}},vs=class{static extractUrlBase(e){let t=e.lastIndexOf(`/`);return t===-1?`./`:e.slice(0,t+1)}static resolveURL(e,t){return typeof e!=`string`||e===``?``:(/^https?:\/\//i.test(t)&&/^\//.test(e)&&(t=t.replace(/(^https?:\/\/[^\/]+).*/i,`$1`)),/^(https?:)?\/\//i.test(e)||/^data:.*,.*$/i.test(e)||/^blob:.*$/i.test(e)?e:t+e)}},ys=class extends Hn{constructor(){super(),this.isInstancedBufferGeometry=!0,this.type=`InstancedBufferGeometry`,this.instanceCount=1/0}copy(e){return super.copy(e),this.instanceCount=e.instanceCount,this}toJSON(){let e=super.toJSON();return e.instanceCount=this.instanceCount,e.isInstancedBufferGeometry=!0,e}},bs=new WeakMap,xs=class extends Wo{constructor(e){super(e),this.isImageBitmapLoader=!0,typeof createImageBitmap>`u`&&F(`ImageBitmapLoader: createImageBitmap() not supported.`),typeof fetch>`u`&&F(`ImageBitmapLoader: fetch() not supported.`),this.options={premultiplyAlpha:`none`},this._abortController=new AbortController}setOptions(e){return this.options=e,this}load(e,t,n,r){e===void 0&&(e=``),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);let i=this,a=Vo.get(`image-bitmap:${e}`);if(a!==void 0){if(i.manager.itemStart(e),a.then){a.then(n=>{bs.has(a)===!0?(r&&r(bs.get(a)),i.manager.itemError(e),i.manager.itemEnd(e)):(t&&t(n),i.manager.itemEnd(e))});return}setTimeout(function(){t&&t(a),i.manager.itemEnd(e)},0);return}let o={};o.credentials=this.crossOrigin===`anonymous`?`same-origin`:`include`,o.headers=this.requestHeader,o.signal=typeof AbortSignal.any==`function`?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal;let s=fetch(e,o).then(function(e){return e.blob()}).then(function(e){return createImageBitmap(e,Object.assign({},i.options,{colorSpaceConversion:`none`}))}).then(function(n){return Vo.add(`image-bitmap:${e}`,n),t&&t(n),i.manager.itemEnd(e),n}).catch(function(t){r&&r(t),bs.set(s,t),Vo.remove(`image-bitmap:${e}`),i.manager.itemError(e),i.manager.itemEnd(e)});Vo.add(`image-bitmap:${e}`,s),i.manager.itemStart(e)}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}},Ss=-90,Cs=1,ws=class extends zt{constructor(e,t,n){super(),this.type=`CubeCamera`,this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;let r=new us(Ss,Cs,e,t);r.layers=this.layers,this.add(r);let i=new us(Ss,Cs,e,t);i.layers=this.layers,this.add(i);let a=new us(Ss,Cs,e,t);a.layers=this.layers,this.add(a);let o=new us(Ss,Cs,e,t);o.layers=this.layers,this.add(o);let s=new us(Ss,Cs,e,t);s.layers=this.layers,this.add(s);let c=new us(Ss,Cs,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){let e=this.coordinateSystem,t=this.children.concat(),[n,r,i,a,o,s]=t;for(let e of t)this.remove(e);if(e===2e3)n.up.set(0,1,0),n.lookAt(1,0,0),r.up.set(0,1,0),r.lookAt(-1,0,0),i.up.set(0,0,-1),i.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),s.up.set(0,1,0),s.lookAt(0,0,-1);else if(e===2001)n.up.set(0,-1,0),n.lookAt(-1,0,0),r.up.set(0,-1,0),r.lookAt(1,0,0),i.up.set(0,0,1),i.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),s.up.set(0,-1,0),s.lookAt(0,0,-1);else throw Error(`THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: `+e);for(let e of t)this.add(e),e.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();let{renderTarget:n,activeMipmapLevel:r}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());let[i,a,o,s,c,l]=this.children,u=e.getRenderTarget(),d=e.getActiveCubeFace(),f=e.getActiveMipmapLevel(),p=e.xr.enabled;e.xr.enabled=!1;let m=n.texture.generateMipmaps;n.texture.generateMipmaps=!1;let h=!1;h=e.isWebGLRenderer===!0?e.state.buffers.depth.getReversed():e.reversedDepthBuffer,e.setRenderTarget(n,0,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,i),e.setRenderTarget(n,1,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,a),e.setRenderTarget(n,2,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,o),e.setRenderTarget(n,3,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,s),e.setRenderTarget(n,4,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),n.texture.generateMipmaps=m,e.setRenderTarget(n,5,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),e.setRenderTarget(u,d,f),e.xr.enabled=p,n.texture.needsPMREMUpdate=!0}},Ts=class extends us{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}},Es=class{constructor(){this._previousTime=0,this._currentTime=0,this._startTime=performance.now(),this._delta=0,this._elapsed=0,this._timescale=1,this._document=null,this._pageVisibilityHandler=null}connect(e){this._document=e,e.hidden!==void 0&&(this._pageVisibilityHandler=Ds.bind(this),e.addEventListener(`visibilitychange`,this._pageVisibilityHandler,!1))}disconnect(){this._pageVisibilityHandler!==null&&(this._document.removeEventListener(`visibilitychange`,this._pageVisibilityHandler),this._pageVisibilityHandler=null),this._document=null}getDelta(){return this._delta/1e3}getElapsed(){return this._elapsed/1e3}getTimescale(){return this._timescale}setTimescale(e){return this._timescale=e,this}reset(){return this._currentTime=performance.now()-this._startTime,this}dispose(){this.disconnect()}update(e){return this._pageVisibilityHandler!==null&&this._document.hidden===!0?this._delta=0:(this._previousTime=this._currentTime,this._currentTime=(e===void 0?performance.now():e)-this._startTime,this._delta=(this._currentTime-this._previousTime)*this._timescale,this._elapsed+=this._delta),this}};function Ds(){this._document.hidden===!1&&this.reset()}var Os=class{constructor(e,t,n){this.binding=e,this.valueSize=n;let r,i,a;switch(t){case`quaternion`:r=this._slerp,i=this._slerpAdditive,a=this._setAdditiveIdentityQuaternion,this.buffer=new Float64Array(n*6),this._workIndex=5;break;case`string`:case`bool`:r=this._select,i=this._select,a=this._setAdditiveIdentityOther,this.buffer=Array(n*5);break;default:r=this._lerp,i=this._lerpAdditive,a=this._setAdditiveIdentityNumeric,this.buffer=new Float64Array(n*5)}this._mixBufferRegion=r,this._mixBufferRegionAdditive=i,this._setIdentity=a,this._origIndex=3,this._addIndex=4,this.cumulativeWeight=0,this.cumulativeWeightAdditive=0,this.useCount=0,this.referenceCount=0}accumulate(e,t){let n=this.buffer,r=this.valueSize,i=e*r+r,a=this.cumulativeWeight;if(a===0){for(let e=0;e!==r;++e)n[i+e]=n[e];a=t}else{a+=t;let e=t/a;this._mixBufferRegion(n,i,0,e,r)}this.cumulativeWeight=a}accumulateAdditive(e){let t=this.buffer,n=this.valueSize,r=n*this._addIndex;this.cumulativeWeightAdditive===0&&this._setIdentity(),this._mixBufferRegionAdditive(t,r,0,e,n),this.cumulativeWeightAdditive+=e}apply(e){let t=this.valueSize,n=this.buffer,r=e*t+t,i=this.cumulativeWeight,a=this.cumulativeWeightAdditive,o=this.binding;if(this.cumulativeWeight=0,this.cumulativeWeightAdditive=0,i<1){let e=t*this._origIndex;this._mixBufferRegion(n,r,e,1-i,t)}a>0&&this._mixBufferRegionAdditive(n,r,this._addIndex*t,1,t);for(let e=t,i=t+t;e!==i;++e)if(n[e]!==n[e+t]){o.setValue(n,r);break}}saveOriginalState(){let e=this.binding,t=this.buffer,n=this.valueSize,r=n*this._origIndex;e.getValue(t,r);for(let e=n,i=r;e!==i;++e)t[e]=t[r+e%n];this._setIdentity(),this.cumulativeWeight=0,this.cumulativeWeightAdditive=0}restoreOriginalState(){let e=this.valueSize*3;this.binding.setValue(this.buffer,e)}_setAdditiveIdentityNumeric(){let e=this._addIndex*this.valueSize,t=e+this.valueSize;for(let n=e;n<t;n++)this.buffer[n]=0}_setAdditiveIdentityQuaternion(){this._setAdditiveIdentityNumeric(),this.buffer[this._addIndex*this.valueSize+3]=1}_setAdditiveIdentityOther(){let e=this._origIndex*this.valueSize,t=this._addIndex*this.valueSize;for(let n=0;n<this.valueSize;n++)this.buffer[t+n]=this.buffer[e+n]}_select(e,t,n,r,i){if(r>=.5)for(let r=0;r!==i;++r)e[t+r]=e[n+r]}_slerp(e,t,n,r){B.slerpFlat(e,t,e,t,e,n,r)}_slerpAdditive(e,t,n,r,i){let a=this._workIndex*i;B.multiplyQuaternionsFlat(e,a,e,t,e,n),B.slerpFlat(e,t,e,t,e,a,r)}_lerp(e,t,n,r,i){let a=1-r;for(let o=0;o!==i;++o){let i=t+o;e[i]=e[i]*a+e[n+o]*r}}_lerpAdditive(e,t,n,r,i){for(let a=0;a!==i;++a){let i=t+a;e[i]=e[i]+e[n+a]*r}}},ks=`\\[\\]\\.:\\/`,As=RegExp(`[\\[\\]\\.:\\/]`,`g`),js=`[^\\[\\]\\.:\\/]`,Ms=`[^`+ks.replace(`\\.`,``)+`]`,Ns=`((?:WC+[\\/:])*)`.replace(`WC`,js),Ps=`(WCOD+)?`.replace(`WCOD`,Ms),Fs=`(?:\\.(WC+)(?:\\[(.+)\\])?)?`.replace(`WC`,js),Is=`\\.(WC+)(?:\\[(.+)\\])?`.replace(`WC`,js),Ls=RegExp(`^`+Ns+Ps+Fs+Is+`$`),Rs=[`material`,`materials`,`bones`,`map`],zs=class{constructor(e,t,n){let r=n||Bs.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,r)}getValue(e,t){this.bind();let n=this._targetGroup.nCachedObjects_,r=this._bindings[n];r!==void 0&&r.getValue(e,t)}setValue(e,t){let n=this._bindings;for(let r=this._targetGroup.nCachedObjects_,i=n.length;r!==i;++r)n[r].setValue(e,t)}bind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].bind()}unbind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].unbind()}},Bs=class e{constructor(t,n,r){this.path=n,this.parsedPath=r||e.parseTrackName(n),this.node=e.findNode(t,this.parsedPath.nodeName),this.rootNode=t,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(t,n,r){return t&&t.isAnimationObjectGroup?new e.Composite(t,n,r):new e(t,n,r)}static sanitizeNodeName(e){return e.replace(/\s/g,`_`).replace(As,``)}static parseTrackName(e){let t=Ls.exec(e);if(t===null)throw Error(`THREE.PropertyBinding: Cannot parse trackName: `+e);let n={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},r=n.nodeName&&n.nodeName.lastIndexOf(`.`);if(r!==void 0&&r!==-1){let e=n.nodeName.substring(r+1);Rs.indexOf(e)!==-1&&(n.nodeName=n.nodeName.substring(0,r),n.objectName=e)}if(n.propertyName===null||n.propertyName.length===0)throw Error(`THREE.PropertyBinding: can not parse propertyName from trackName: `+e);return n}static findNode(e,t){if(t===void 0||t===``||t===`.`||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){let n=e.skeleton.getBoneByName(t);if(n!==void 0)return n}if(e.children){let n=function(e){for(let r=0;r<e.length;r++){let i=e[r];if(i.name===t||i.uuid===t)return i;let a=n(i.children);if(a)return a}return null},r=n(e.children);if(r)return r}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)e[t++]=n[r]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)n[r]=e[t++]}_setValue_array_setNeedsUpdate(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)n[r]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)n[r]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let t=this.node,n=this.parsedPath,r=n.objectName,i=n.propertyName,a=n.propertyIndex;if(t||(t=e.findNode(this.rootNode,n.nodeName),this.node=t),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!t){F(`PropertyBinding: No target node found for track: `+this.path+`.`);return}if(r){let e=n.objectIndex;switch(r){case`materials`:if(!t.material){me(`PropertyBinding: Can not bind to material as node does not have a material.`,this);return}if(!t.material.materials){me(`PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.`,this);return}t=t.material.materials;break;case`bones`:if(!t.skeleton){me(`PropertyBinding: Can not bind to bones as node does not have a skeleton.`,this);return}t=t.skeleton.bones;for(let n=0;n<t.length;n++)if(t[n].name===e){e=n;break}break;case`map`:if(`map`in t){t=t.map;break}if(!t.material){me(`PropertyBinding: Can not bind to material as node does not have a material.`,this);return}if(!t.material.map){me(`PropertyBinding: Can not bind to material.map as node.material does not have a map.`,this);return}t=t.material.map;break;default:if(t[r]===void 0){me(`PropertyBinding: Can not bind to objectName of node undefined.`,this);return}t=t[r]}if(e!==void 0){if(t[e]===void 0){me(`PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.`,this,t);return}t=t[e]}}let o=t[i];if(o===void 0){let e=n.nodeName;me(`PropertyBinding: Trying to update property for track: `+e+`.`+i+` but it wasn't found.`,t);return}let s=this.Versioning.None;this.targetObject=t,t.isMaterial===!0?s=this.Versioning.NeedsUpdate:t.isObject3D===!0&&(s=this.Versioning.MatrixWorldNeedsUpdate);let c=this.BindingType.Direct;if(a!==void 0){if(i===`morphTargetInfluences`){if(!t.geometry){me(`PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.`,this);return}if(!t.geometry.morphAttributes){me(`PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.`,this);return}t.morphTargetDictionary[a]!==void 0&&(a=t.morphTargetDictionary[a])}c=this.BindingType.ArrayElement,this.resolvedProperty=o,this.propertyIndex=a}else o.fromArray!==void 0&&o.toArray!==void 0?(c=this.BindingType.HasFromToArray,this.resolvedProperty=o):Array.isArray(o)?(c=this.BindingType.EntireArray,this.resolvedProperty=o):this.propertyName=i;this.getValue=this.GetterByBindingType[c],this.setValue=this.SetterByBindingTypeAndVersioning[c][s]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};Bs.Composite=zs,Bs.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3},Bs.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2},Bs.prototype.GetterByBindingType=[Bs.prototype._getValue_direct,Bs.prototype._getValue_array,Bs.prototype._getValue_arrayElement,Bs.prototype._getValue_toArray],Bs.prototype.SetterByBindingTypeAndVersioning=[[Bs.prototype._setValue_direct,Bs.prototype._setValue_direct_setNeedsUpdate,Bs.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[Bs.prototype._setValue_array,Bs.prototype._setValue_array_setNeedsUpdate,Bs.prototype._setValue_array_setMatrixWorldNeedsUpdate],[Bs.prototype._setValue_arrayElement,Bs.prototype._setValue_arrayElement_setNeedsUpdate,Bs.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[Bs.prototype._setValue_fromArray,Bs.prototype._setValue_fromArray_setNeedsUpdate,Bs.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var Vs=class{constructor(e,t,n=null,r=t.blendMode){this._mixer=e,this._clip=t,this._localRoot=n,this.blendMode=r;let i=t.tracks,a=i.length,o=Array(a),s={endingStart:k,endingEnd:k};for(let e=0;e!==a;++e){let t=i[e].createInterpolant(null);o[e]=t,t.settings=s}this._interpolantSettings=s,this._interpolants=o,this._propertyBindings=Array(a),this._cacheIndex=null,this._byClipCacheIndex=null,this._timeScaleInterpolant=null,this._restoreTimeScale=null,this._weightInterpolant=null,this.loop=2201,this._loopCount=-1,this._startTime=null,this.time=0,this.timeScale=1,this._effectiveTimeScale=1,this.weight=1,this._effectiveWeight=1,this.repetitions=1/0,this.paused=!1,this.enabled=!0,this.clampWhenFinished=!1,this.zeroSlopeAtStart=!0,this.zeroSlopeAtEnd=!0}play(){return this._mixer._activateAction(this),this}stop(){return this._mixer._deactivateAction(this),this.reset()}reset(){return this.paused=!1,this.enabled=!0,this.time=0,this._loopCount=-1,this._startTime=null,this.stopFading().stopWarping()}isRunning(){return this.enabled&&!this.paused&&this.timeScale!==0&&this._startTime===null&&this._mixer._isActiveAction(this)}isScheduled(){return this._mixer._isActiveAction(this)}startAt(e){return this._startTime=e,this}setLoop(e,t){return this.loop=e,this.repetitions=t,this}setEffectiveWeight(e){return this.weight=e,this._effectiveWeight=this.enabled?e:0,this.stopFading()}getEffectiveWeight(){return this._effectiveWeight}fadeIn(e){return this._scheduleFading(e,0,1)}fadeOut(e){return this._scheduleFading(e,1,0)}crossFadeFrom(e,t,n=!1){if(e.fadeOut(t),this.fadeIn(t),n===!0){let n=this._clip.duration,r=e._clip.duration,i=r/n,a=n/r;e._restoreTimeScale=e.timeScale,this._restoreTimeScale=this.timeScale,e.warp(1,i,t),this.warp(a,1,t)}return this}crossFadeTo(e,t,n=!1){return e.crossFadeFrom(this,t,n)}stopFading(){let e=this._weightInterpolant;return e!==null&&(this._weightInterpolant=null,this._mixer._takeBackControlInterpolant(e)),this}setEffectiveTimeScale(e){return this.timeScale=e,this._effectiveTimeScale=this.paused?0:e,this.stopWarping()}getEffectiveTimeScale(){return this._effectiveTimeScale}setDuration(e){return this.timeScale=this._clip.duration/e,this.stopWarping()}syncWith(e){return this.time=e.time,this.timeScale=e.timeScale,this.stopWarping()}halt(e){return this.warp(this._effectiveTimeScale,0,e)}warp(e,t,n){let r=this._mixer,i=r.time,a=this.timeScale,o=this._timeScaleInterpolant;o===null&&(o=r._lendControlInterpolant(),this._timeScaleInterpolant=o);let s=o.parameterPositions,c=o.sampleValues;return s[0]=i,s[1]=i+n,c[0]=e/a,c[1]=t/a,this}stopWarping(){let e=this._timeScaleInterpolant;return e!==null&&(this._timeScaleInterpolant=null,this._mixer._takeBackControlInterpolant(e)),this._restoreTimeScale=null,this}getMixer(){return this._mixer}getClip(){return this._clip}getRoot(){return this._localRoot||this._mixer._root}_update(e,t,n,r){if(!this.enabled){this._updateWeight(e);return}let i=this._startTime;if(i!==null){let r=(e-i)*n;r<0||n===0?t=0:(this._startTime=null,t=n*r)}t*=this._updateTimeScale(e);let a=this._updateTime(t),o=this._updateWeight(e);if(o>0){let e=this._interpolants,t=this._propertyBindings;switch(this.blendMode){case ee:for(let n=0,r=e.length;n!==r;++n)e[n].evaluate(a),t[n].accumulateAdditive(o);break;case M:default:for(let n=0,i=e.length;n!==i;++n)e[n].evaluate(a),t[n].accumulate(r,o)}}}_updateWeight(e){let t=0;if(this.enabled){t=this.weight;let n=this._weightInterpolant;if(n!==null){let r=n.evaluate(e)[0];t*=r,e>n.parameterPositions[1]&&(this.stopFading(),r===0&&(this.enabled=!1))}}return this._effectiveWeight=t,t}_updateTimeScale(e){let t=0;if(!this.paused){t=this.timeScale;let n=this._timeScaleInterpolant;if(n!==null){let r=n.evaluate(e)[0];t*=r,e>n.parameterPositions[1]&&(t===0?this.paused=!0:(this._restoreTimeScale!==null&&(t=this._restoreTimeScale),this.timeScale=t),this.stopWarping())}}return this._effectiveTimeScale=t,t}_updateTime(e){let t=this._clip.duration,n=this.loop,r=this.time+e,i=this._loopCount,a=n===2202;if(e===0)return i===-1?r:a&&(i&1)==1?t-r:r;if(n===2200){i===-1&&(this._loopCount=0,this._setEndings(!0,!0,!1));handle_stop:{if(r>=t)r=t;else if(r<0)r=0;else{this.time=r;break handle_stop}this.clampWhenFinished?this.paused=!0:this.enabled=!1,this.time=r,this._mixer.dispatchEvent({type:`finished`,action:this,direction:e<0?-1:1})}}else{if(i===-1&&(e>=0?(i=0,this._setEndings(!0,this.repetitions===0,a)):this._setEndings(this.repetitions===0,!0,a)),r>=t||r<0){let n=Math.floor(r/t);r-=t*n,i+=Math.abs(n);let o=this.repetitions-i;if(o<=0)this.clampWhenFinished?this.paused=!0:this.enabled=!1,r=e>0?t:0,this.time=r,this._mixer.dispatchEvent({type:`finished`,action:this,direction:e>0?1:-1});else{if(o===1){let t=e<0;this._setEndings(t,!t,a)}else this._setEndings(!1,!1,a);this._loopCount=i,this.time=r,this._mixer.dispatchEvent({type:`loop`,action:this,loopDelta:n})}}else this._loopCount=i,this.time=r;if(a&&(i&1)==1)return t-r}return r}_setEndings(e,t,n){let r=this._interpolantSettings;n?(r.endingStart=A,r.endingEnd=A):(r.endingStart=e?this.zeroSlopeAtStart?A:k:j,r.endingEnd=t?this.zeroSlopeAtEnd?A:k:j)}_scheduleFading(e,t,n){let r=this._mixer,i=r.time,a=this._weightInterpolant;a===null&&(a=r._lendControlInterpolant(),this._weightInterpolant=a);let o=a.parameterPositions,s=a.sampleValues;return o[0]=i,s[0]=t,o[1]=i+e,s[1]=n,this}},Hs=new Float32Array(1),Us=class extends ve{constructor(e){super(),this._root=e,this._initMemoryManager(),this._accuIndex=0,this.time=0,this.timeScale=1,typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`observe`,{detail:this}))}_bindAction(e,t){let n=e._localRoot||this._root,r=e._clip.tracks,i=r.length,a=e._propertyBindings,o=e._interpolants,s=n.uuid,c=this._bindingsByRootAndName,l=c[s];l===void 0&&(l={},c[s]=l);for(let e=0;e!==i;++e){let i=r[e],c=i.name,u=l[c];if(u!==void 0)++u.referenceCount,a[e]=u;else{if(u=a[e],u!==void 0){u._cacheIndex===null&&(++u.referenceCount,this._addInactiveBinding(u,s,c));continue}let r=t&&t._propertyBindings[e].binding.parsedPath;u=new Os(Bs.create(n,c,r),i.ValueTypeName,i.getValueSize()),++u.referenceCount,this._addInactiveBinding(u,s,c),a[e]=u}o[e].resultBuffer=u.buffer}}_activateAction(e){if(!this._isActiveAction(e)){if(e._cacheIndex===null){let t=(e._localRoot||this._root).uuid,n=e._clip.uuid,r=this._actionsByClip[n];this._bindAction(e,r&&r.knownActions[0]),this._addInactiveAction(e,n,t)}let t=e._propertyBindings;for(let e=0,n=t.length;e!==n;++e){let n=t[e];n.useCount++===0&&(this._lendBinding(n),n.saveOriginalState())}this._lendAction(e)}}_deactivateAction(e){if(this._isActiveAction(e)){let t=e._propertyBindings;for(let e=0,n=t.length;e!==n;++e){let n=t[e];--n.useCount===0&&(n.restoreOriginalState(),this._takeBackBinding(n))}this._takeBackAction(e)}}_initMemoryManager(){this._actions=[],this._nActiveActions=0,this._actionsByClip={},this._bindings=[],this._nActiveBindings=0,this._bindingsByRootAndName={},this._controlInterpolants=[],this._nActiveControlInterpolants=0;let e=this;this.stats={actions:{get total(){return e._actions.length},get inUse(){return e._nActiveActions}},bindings:{get total(){return e._bindings.length},get inUse(){return e._nActiveBindings}},controlInterpolants:{get total(){return e._controlInterpolants.length},get inUse(){return e._nActiveControlInterpolants}}}}_isActiveAction(e){let t=e._cacheIndex;return t!==null&&t<this._nActiveActions}_addInactiveAction(e,t,n){let r=this._actions,i=this._actionsByClip,a=i[t];if(a===void 0)a={knownActions:[e],actionByRoot:{}},e._byClipCacheIndex=0,i[t]=a;else{let t=a.knownActions;e._byClipCacheIndex=t.length,t.push(e)}e._cacheIndex=r.length,r.push(e),a.actionByRoot[n]=e}_removeInactiveAction(e){let t=this._actions,n=t[t.length-1],r=e._cacheIndex;n._cacheIndex=r,t[r]=n,t.pop(),e._cacheIndex=null;let i=e._clip.uuid,a=this._actionsByClip,o=a[i],s=o.knownActions,c=s[s.length-1],l=e._byClipCacheIndex;c._byClipCacheIndex=l,s[l]=c,s.pop(),e._byClipCacheIndex=null;let u=o.actionByRoot,d=(e._localRoot||this._root).uuid;delete u[d],s.length===0&&delete a[i],this._removeInactiveBindingsForAction(e)}_removeInactiveBindingsForAction(e){let t=e._propertyBindings;for(let e=0,n=t.length;e!==n;++e){let n=t[e];--n.referenceCount===0&&this._removeInactiveBinding(n)}}_lendAction(e){let t=this._actions,n=e._cacheIndex,r=this._nActiveActions++,i=t[r];e._cacheIndex=r,t[r]=e,i._cacheIndex=n,t[n]=i}_takeBackAction(e){let t=this._actions,n=e._cacheIndex,r=--this._nActiveActions,i=t[r];e._cacheIndex=r,t[r]=e,i._cacheIndex=n,t[n]=i}_addInactiveBinding(e,t,n){let r=this._bindingsByRootAndName,i=this._bindings,a=r[t];a===void 0&&(a={},r[t]=a),a[n]=e,e._cacheIndex=i.length,i.push(e)}_removeInactiveBinding(e){let t=this._bindings,n=e.binding,r=n.rootNode.uuid,i=n.path,a=this._bindingsByRootAndName,o=a[r],s=t[t.length-1],c=e._cacheIndex;s._cacheIndex=c,t[c]=s,t.pop(),delete o[i],Object.keys(o).length===0&&delete a[r]}_lendBinding(e){let t=this._bindings,n=e._cacheIndex,r=this._nActiveBindings++,i=t[r];e._cacheIndex=r,t[r]=e,i._cacheIndex=n,t[n]=i}_takeBackBinding(e){let t=this._bindings,n=e._cacheIndex,r=--this._nActiveBindings,i=t[r];e._cacheIndex=r,t[r]=e,i._cacheIndex=n,t[n]=i}_lendControlInterpolant(){let e=this._controlInterpolants,t=this._nActiveControlInterpolants++,n=e[t];return n===void 0&&(n=new Co(new Float32Array(2),new Float32Array(2),1,Hs),n.__cacheIndex=t,e[t]=n),n}_takeBackControlInterpolant(e){let t=this._controlInterpolants,n=e.__cacheIndex,r=--this._nActiveControlInterpolants,i=t[r];e.__cacheIndex=r,t[r]=e,i.__cacheIndex=n,t[n]=i}clipAction(e,t,n){let r=t||this._root,i=r.uuid,a=typeof e==`string`?Ro.findByName(r,e):e,o=a===null?e:a.uuid,s=this._actionsByClip[o],c=null;if(n===void 0&&(n=a===null?M:a.blendMode),s!==void 0){let e=s.actionByRoot[i];if(e!==void 0&&e.blendMode===n)return e;c=s.knownActions[0],a===null&&(a=c._clip)}if(a===null)return null;let l=new Vs(this,a,t,n);return this._bindAction(l,c),this._addInactiveAction(l,o,i),l}existingAction(e,t){let n=t||this._root,r=n.uuid,i=typeof e==`string`?Ro.findByName(n,e):e,a=i?i.uuid:e,o=this._actionsByClip[a];return o===void 0?null:o.actionByRoot[r]||null}stopAllAction(){let e=this._actions,t=this._nActiveActions;for(let n=t-1;n>=0;--n)e[n].stop();return this}update(e){e*=this.timeScale;let t=this._actions,n=this._nActiveActions,r=this.time+=e,i=Math.sign(e),a=this._accuIndex^=1;for(let o=0;o!==n;++o)t[o]._update(r,e,i,a);let o=this._bindings,s=this._nActiveBindings;for(let e=0;e!==s;++e)o[e].apply(a);return this}setTime(e){this.time=0;for(let e=0;e<this._actions.length;e++)this._actions[e].time=0;return this.update(e)}getRoot(){return this._root}uncacheClip(e){let t=this._actions,n=e.uuid,r=this._actionsByClip,i=r[n];if(i!==void 0){let e=i.knownActions;for(let n=0,r=e.length;n!==r;++n){let r=e[n];this._deactivateAction(r);let i=r._cacheIndex,a=t[t.length-1];r._cacheIndex=null,r._byClipCacheIndex=null,a._cacheIndex=i,t[i]=a,t.pop(),this._removeInactiveBindingsForAction(r)}delete r[n]}}uncacheRoot(e){let t=e.uuid,n=this._actionsByClip;for(let e in n){let r=n[e].actionByRoot[t];r!==void 0&&(this._deactivateAction(r),this._removeInactiveAction(r))}let r=this._bindingsByRootAndName[t];if(r!==void 0)for(let e in r){let t=r[e];t.restoreOriginalState(),this._removeInactiveBinding(t)}}uncacheAction(e,t){let n=this.existingAction(e,t);n!==null&&(this._deactivateAction(n),this._removeInactiveAction(n))}},Ws=new ft,Gs=class{constructor(e,t,n=0,r=1/0){this.ray=new nr(e,t),this.near=n,this.far=r,this.camera=null,this.layers=new Ct,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(e,t){this.ray.set(e,t)}setFromCamera(e,t){t.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(e.x,e.y,.5).unproject(t).sub(this.ray.origin).normalize(),this.camera=t):t.isOrthographicCamera?(this.ray.origin.set(e.x,e.y,t.projectionMatrix.elements[14]).unproject(t),this.ray.direction.set(0,0,-1).transformDirection(t.matrixWorld),this.camera=t):me(`Raycaster: Unsupported camera type: `+t.type)}setFromXRController(e){return Ws.identity().extractRotation(e.matrixWorld),this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(Ws),this}intersectObject(e,t=!0,n=[]){return qs(e,this,n,t),n.sort(Ks),n}intersectObjects(e,t=!0,n=[]){for(let r=0,i=e.length;r<i;r++)qs(e[r],this,n,t);return n.sort(Ks),n}};function Ks(e,t){return e.distance-t.distance}function qs(e,t,n,r){let i=!0;if(e.layers.test(t.layers)&&e.raycast(t,n)===!1&&(i=!1),i===!0&&r===!0){let r=e.children;for(let e=0,i=r.length;e<i;e++)qs(r[e],t,n,!0)}}(class e{static{e.prototype.isMatrix2=!0}constructor(e,t,n,r){this.elements=[1,0,0,1],e!==void 0&&this.set(e,t,n,r)}identity(){return this.set(1,0,0,1),this}fromArray(e,t=0){for(let n=0;n<4;n++)this.elements[n]=e[n+t];return this}set(e,t,n,r){let i=this.elements;return i[0]=e,i[2]=t,i[1]=n,i[3]=r,this}});function Js(e,t,n,r){let i=Ys(r);switch(n){case 1021:return e*t;case b:return e*t/i.components*i.byteLength;case x:return e*t/i.components*i.byteLength;case S:return e*t*2/i.components*i.byteLength;case C:return e*t*2/i.components*i.byteLength;case 1022:return e*t*3/i.components*i.byteLength;case _:return e*t*4/i.components*i.byteLength;case w:return e*t*4/i.components*i.byteLength;case 33776:case 33777:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*8;case 33778:case 33779:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*16;case 35841:case 35843:return Math.max(e,16)*Math.max(t,8)/4;case 35840:case 35842:return Math.max(e,8)*Math.max(t,8)/2;case 36196:case 37492:case 37488:case 37489:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*8;case 37496:case 37490:case 37491:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*16;case 37808:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*16;case 37809:return Math.floor((e+4)/5)*Math.floor((t+3)/4)*16;case 37810:return Math.floor((e+4)/5)*Math.floor((t+4)/5)*16;case 37811:return Math.floor((e+5)/6)*Math.floor((t+4)/5)*16;case 37812:return Math.floor((e+5)/6)*Math.floor((t+5)/6)*16;case 37813:return Math.floor((e+7)/8)*Math.floor((t+4)/5)*16;case 37814:return Math.floor((e+7)/8)*Math.floor((t+5)/6)*16;case 37815:return Math.floor((e+7)/8)*Math.floor((t+7)/8)*16;case 37816:return Math.floor((e+9)/10)*Math.floor((t+4)/5)*16;case 37817:return Math.floor((e+9)/10)*Math.floor((t+5)/6)*16;case 37818:return Math.floor((e+9)/10)*Math.floor((t+7)/8)*16;case 37819:return Math.floor((e+9)/10)*Math.floor((t+9)/10)*16;case 37820:return Math.floor((e+11)/12)*Math.floor((t+9)/10)*16;case 37821:return Math.floor((e+11)/12)*Math.floor((t+11)/12)*16;case 36492:case 36494:case 36495:return Math.ceil(e/4)*Math.ceil(t/4)*16;case 36283:case 36284:return Math.ceil(e/4)*Math.ceil(t/4)*8;case 36285:case 36286:return Math.ceil(e/4)*Math.ceil(t/4)*16}throw Error(`Unable to determine texture byte length for ${n} format.`)}function Ys(e){switch(e){case l:case 1010:return{byteLength:1,components:1};case u:case 1011:case p:return{byteLength:2,components:1};case m:case h:return{byteLength:2,components:4};case d:case 1013:case f:return{byteLength:4,components:1};case 35902:case 35899:return{byteLength:4,components:3}}throw Error(`THREE.TextureUtils: Unknown texture type ${e}.`)}typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`register`,{detail:{revision:`186`}})),typeof window<`u`&&(window.__THREE__?F(`WARNING: Multiple instances of Three.js being imported.`):window.__THREE__=`186`);function Xs(){let e=null,t=!1,n=null,r=null;function i(t,a){r=e.requestAnimationFrame(i),n(t,a)}return{start:function(){t!==!0&&n!==null&&e!==null&&(r=e.requestAnimationFrame(i),t=!0)},stop:function(){e!==null&&e.cancelAnimationFrame(r),t=!1},setAnimationLoop:function(e){n=e},setContext:function(t){e=t}}}function Zs(e){let t=new WeakMap;function n(t,n){let r=t.array,i=t.usage,a=r.byteLength,o=e.createBuffer();e.bindBuffer(n,o),e.bufferData(n,r,i),t.onUploadCallback();let s;if(r instanceof Float32Array)s=e.FLOAT;else if(typeof Float16Array<`u`&&r instanceof Float16Array)s=e.HALF_FLOAT;else if(r instanceof Uint16Array)s=t.isFloat16BufferAttribute?e.HALF_FLOAT:e.UNSIGNED_SHORT;else if(r instanceof Int16Array)s=e.SHORT;else if(r instanceof Uint32Array)s=e.UNSIGNED_INT;else if(r instanceof Int32Array)s=e.INT;else if(r instanceof Int8Array)s=e.BYTE;else if(r instanceof Uint8Array)s=e.UNSIGNED_BYTE;else if(r instanceof Uint8ClampedArray)s=e.UNSIGNED_BYTE;else throw Error(`THREE.WebGLAttributes: Unsupported buffer data format: `+r);return{buffer:o,type:s,bytesPerElement:r.BYTES_PER_ELEMENT,version:t.version,size:a}}function r(t,n,r){let i=n.array,a=n.updateRanges;if(e.bindBuffer(r,t),a.length===0)e.bufferSubData(r,0,i);else{a.sort((e,t)=>e.start-t.start);let t=0;for(let e=1;e<a.length;e++){let n=a[t],r=a[e];r.start<=n.start+n.count+1?n.count=Math.max(n.count,r.start+r.count-n.start):(++t,a[t]=r)}a.length=t+1;for(let t=0,n=a.length;t<n;t++){let n=a[t];e.bufferSubData(r,n.start*i.BYTES_PER_ELEMENT,i,n.start,n.count)}n.clearUpdateRanges()}n.onUploadCallback()}function i(e){return e.isInterleavedBufferAttribute&&(e=e.data),t.get(e)}function a(n){n.isInterleavedBufferAttribute&&(n=n.data);let r=t.get(n);r&&(e.deleteBuffer(r.buffer),t.delete(n))}function o(e,i){if(e.isInterleavedBufferAttribute&&(e=e.data),e.isGLBufferAttribute){let n=t.get(e);(!n||n.version<e.version)&&t.set(e,{buffer:e.buffer,type:e.type,bytesPerElement:e.elementSize,version:e.version});return}let a=t.get(e);if(a===void 0)t.set(e,n(e,i));else if(a.version<e.version){if(a.size!==e.array.byteLength)throw Error(`THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.`);r(a.buffer,e,i),a.version=e.version}}return{get:i,remove:a,update:o}}var Qs={alphahash_fragment:`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,alphahash_pars_fragment:`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,alphamap_fragment:`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,alphamap_pars_fragment:`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,alphatest_fragment:`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,alphatest_pars_fragment:`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,aomap_fragment:`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,aomap_pars_fragment:`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,batching_pars_vertex:`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,batching_vertex:`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,begin_vertex:`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,beginnormal_vertex:`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,bsdfs:`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,iridescence_fragment:`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,bumpmap_pars_fragment:`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,clipping_planes_fragment:`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,clipping_planes_pars_fragment:`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,clipping_planes_pars_vertex:`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,clipping_planes_vertex:`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,color_fragment:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,color_pars_fragment:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,color_pars_vertex:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,color_vertex:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,common:`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,cube_uv_reflection_fragment:`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,defaultnormal_vertex:`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,displacementmap_pars_vertex:`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,displacementmap_vertex:`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,emissivemap_fragment:`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,emissivemap_pars_fragment:`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,colorspace_fragment:`gl_FragColor = linearToOutputTexel( gl_FragColor );`,colorspace_pars_fragment:`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,envmap_fragment:`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,envmap_common_pars_fragment:`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,envmap_pars_fragment:`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,envmap_pars_vertex:`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,envmap_physical_pars_fragment:`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_RETROREFLECTION
		vec3 getIBLRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 retroVec = normalize( mix( viewDir, normal, pow4( roughness ) ) );
				retroVec = transformDirectionByInverseViewMatrix( retroVec, viewMatrix );
				vec4 envMapColor = textureCubeUV( envMap, envMapRotation * retroVec, roughness );
				return envMapColor.rgb * envMapIntensity;
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
		#ifdef USE_RETROREFLECTION
			vec3 getIBLAnisotropyRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
				#ifdef ENVMAP_TYPE_CUBE_UV
					vec3 bentNormal = cross( bitangent, viewDir );
					bentNormal = normalize( cross( bentNormal, bitangent ) );
					bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
					return getIBLRetroRadiance( viewDir, bentNormal, roughness );
				#else
					return vec3( 0.0 );
				#endif
			}
		#endif
	#endif
#endif`,envmap_vertex:`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,fog_vertex:`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,fog_pars_vertex:`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,fog_fragment:`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,fog_pars_fragment:`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,gradientmap_pars_fragment:`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,lightmap_pars_fragment:`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,lights_lambert_fragment:`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,lights_lambert_pars_fragment:`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,lights_pars_begin:`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_SUN_LIGHTS > 0
	struct SunLight {
		vec3 direction;
		vec3 color;
	};
	uniform SunLight sunLights[ NUM_SUN_LIGHTS ];
	void getSunLightInfo( const in SunLight sunLight, out IncidentLight light ) {
		light.color = sunLight.color;
		light.direction = sunLight.direction;
		light.visible = true;
	}
#endif
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,lights_toon_fragment:`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,lights_toon_pars_fragment:`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,lights_phong_fragment:`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,lights_phong_pars_fragment:`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,lights_physical_fragment:`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_RETROREFLECTION
	material.retroreflectivity = retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,lights_physical_pars_fragment:`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	vec2 dfg;
	vec3 multiScatteringCompensation;
	#ifdef USE_RETROREFLECTION
		float retroreflectivity;
	#endif
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0Dielectric;
		vec3 iridescenceF0Metallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec2 fab, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec2 fab, const in vec3 specularColor, const in float specularF90, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	vec3 specularBRDF = BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	#ifdef USE_RETROREFLECTION
		vec3 retroViewDir = reflect( - geometryViewDir, geometryNormal );
		vec3 retroSpecularBRDF = BRDF_GGX( directLight.direction, retroViewDir, geometryNormal, material );
		specularBRDF = mix( specularBRDF, retroSpecularBRDF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directSpecular += irradiance * specularBRDF * material.multiScatteringCompensation;
	vec3 halfDir = normalize( directLight.direction + geometryViewDir );
	float dotVH = saturate( dot( geometryViewDir, halfDir ) );
	vec3 F = F_Schlick( material.specularColor, material.specularF90, dotVH );
	#ifdef USE_RETROREFLECTION
		vec3 retroHalfDir = normalize( directLight.direction + retroViewDir );
		float dotRetroVH = saturate( dot( retroViewDir, retroHalfDir ) );
		vec3 retroF = F_Schlick( material.specularColor, material.specularF90, dotRetroVH );
		F = mix( F, retroF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScattering, multiScattering );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScattering, multiScattering );
	#endif
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - singleScattering - multiScattering );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		sheenSpecularIndirect += irradiance * material.sheenColor * sheenAlbedo * RECIPROCAL_PI;
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( material.dfg, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceF0Metallic, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( material.dfg, material.diffuseColor, material.specularF90, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,lights_fragment_begin:`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		vec3 iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		vec3 iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( iridescenceFresnelDielectric, iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0Dielectric = Schlick_to_F0( iridescenceFresnelDielectric, 1.0, dotNVi );
		material.iridescenceF0Metallic = Schlick_to_F0( iridescenceFresnelMetallic, 1.0, dotNVi );
	}
#endif
#ifdef STANDARD
	float dotNVms = saturate( dot( geometryNormal, geometryViewDir ) );
	material.dfg = texture2D( dfgLUT, vec2( material.roughness, dotNVms ) ).rg;
	#if ( NUM_SUN_LIGHTS > 0 || NUM_DIR_LIGHTS > 0 || NUM_POINT_LIGHTS > 0 || NUM_SPOT_LIGHTS > 0 )
		float EssMs = material.dfg.x + material.dfg.y;
		material.multiScatteringCompensation = 1.0 + material.specularColorBlended * ( 1.0 / EssMs - 1.0 );
	#endif
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SUN_LIGHTS > 0 ) && defined( RE_Direct )
	SunLight sunLight;
	#if defined( USE_SHADOWMAP ) && NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHTS; i ++ ) {
		sunLight = sunLights[ i ];
		getSunLightInfo( sunLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SUN_LIGHT_SHADOWS )
		sunLightShadow = sunLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getSunShadow( sunShadowMap[ i ], sunLightShadow, UNROLLED_LOOP_INDEX ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#ifdef USE_LIGHT_PROBES_GRID
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		irradiance += getLightProbeGridIrradiance( probeWorldPos, probeWorldNormal );
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,lights_fragment_maps:`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		vec3 iblRadiance = getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		vec3 iblRadiance = getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_RETROREFLECTION
		#ifdef USE_ANISOTROPY
			vec3 retroIBLRadiance = getIBLAnisotropyRetroRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
		#else
			vec3 retroIBLRadiance = getIBLRetroRadiance( geometryViewDir, geometryNormal, material.roughness );
		#endif
		iblRadiance = mix( iblRadiance, retroIBLRadiance, saturate( material.retroreflectivity ) );
	#endif
	radiance += iblRadiance;
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,lights_fragment_end:`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,lightprobes_pars_fragment:`#ifdef USE_LIGHT_PROBES_GRID
uniform highp sampler3D probesSH;
uniform vec3 probesMin;
uniform vec3 probesMax;
uniform vec3 probesResolution;
vec3 getLightProbeGridIrradiance( vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 resMinusOne = res - 1.0;
	vec3 probeSpacing = gridRange / resMinusOne;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.0, 1.0 );
	uvw = uvw * resMinusOne / res + 0.5 / res;
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,logdepthbuf_fragment:`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,logdepthbuf_pars_fragment:`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,logdepthbuf_pars_vertex:`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,logdepthbuf_vertex:`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,map_fragment:`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,map_pars_fragment:`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,map_particle_fragment:`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,map_particle_pars_fragment:`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,metalnessmap_fragment:`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,metalnessmap_pars_fragment:`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,morphinstance_vertex:`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,morphcolor_vertex:`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,morphnormal_vertex:`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,morphtarget_pars_vertex:`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,morphtarget_vertex:`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,normal_fragment_begin:`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,normal_fragment_maps:`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,normal_pars_fragment:`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,normal_pars_vertex:`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,normal_vertex:`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,normalmap_pars_fragment:`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,clearcoat_normal_fragment_begin:`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,clearcoat_normal_fragment_maps:`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,clearcoat_pars_fragment:`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,iridescence_pars_fragment:`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,opaque_fragment:`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,packing:`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,premultiplied_alpha_fragment:`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,project_vertex:`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,dithering_fragment:`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,dithering_pars_fragment:`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,roughnessmap_fragment:`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,roughnessmap_pars_fragment:`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,shadowmap_pars_fragment:`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		#define SUN_LIGHT_CASCADES 2
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#else
			uniform sampler2D sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#endif
		uniform mat4 sunShadowMatrix[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		uniform vec4 sunShadowCascade[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
		struct SunLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SunLightShadow sunLightShadows[ NUM_SUN_LIGHT_SHADOWS ];
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_SUN_LIGHT_SHADOWS > 0
		float getSunShadow(
			#if defined( SHADOWMAP_TYPE_PCF )
				sampler2DShadow shadowMap,
			#else
				sampler2D shadowMap,
			#endif
			SunLightShadow sunLightShadow,
			int shadowIndex
		) {
			vec4 shadowWorldPosition = vec4( vSunShadowWorldPosition.xyz + vSunShadowWorldNormal * sunLightShadow.shadowNormalBias, 1.0 );
			float viewDepth = vSunShadowWorldPosition.w;
			int cascadeOffset = shadowIndex * SUN_LIGHT_CASCADES;
			float shadow = 1.0;
			for ( int i = SUN_LIGHT_CASCADES - 1; i >= 0; i -- ) {
				vec4 cascade = sunShadowCascade[ cascadeOffset + i ];
				if ( viewDepth >= cascade.x && viewDepth < cascade.y ) {
					float cascadeShadow = getShadow(
						shadowMap,
						sunLightShadow.shadowMapSize,
						sunLightShadow.shadowIntensity,
						sunLightShadow.shadowBias,
						sunLightShadow.shadowRadius,
						sunShadowMatrix[ cascadeOffset + i ] * shadowWorldPosition
					);
					shadow = mix( cascadeShadow, shadow, smoothstep( cascade.z, cascade.y, viewDepth ) );
				}
			}
			return shadow;
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,shadowmap_pars_vertex:`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,shadowmap_vertex:`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_SUN_LIGHT_SHADOWS > 0
		vSunShadowWorldPosition = vec4( worldPosition.xyz, - mvPosition.z );
		vSunShadowWorldNormal = shadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,shadowmask_pars_fragment:`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHT_SHADOWS; i ++ ) {
		sunLight = sunLightShadows[ i ];
		shadow *= receiveShadow ? getSunShadow( sunShadowMap[ i ], sunLight, UNROLLED_LOOP_INDEX ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,skinbase_vertex:`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,skinning_pars_vertex:`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,skinning_vertex:`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,skinnormal_vertex:`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,specularmap_fragment:`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,specularmap_pars_fragment:`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,tonemapping_fragment:`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,tonemapping_pars_fragment:`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,transmission_fragment:`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,transmission_pars_fragment:`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,uv_pars_fragment:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,uv_pars_vertex:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,uv_vertex:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,worldpos_vertex:`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,background_vert:`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,background_frag:`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,backgroundCube_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,backgroundCube_frag:`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,cube_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,cube_frag:`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,depth_vert:`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,depth_frag:`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,distance_vert:`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,distance_frag:`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,equirect_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,equirect_frag:`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,linedashed_vert:`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,linedashed_frag:`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,meshbasic_vert:`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,meshbasic_frag:`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshlambert_vert:`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshlambert_frag:`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshmatcap_vert:`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,meshmatcap_frag:`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshnormal_vert:`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,meshnormal_frag:`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,meshphong_vert:`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshphong_frag:`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshphysical_vert:`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,meshphysical_frag:`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_RETROREFLECTION
	uniform float retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshtoon_vert:`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshtoon_frag:`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,points_vert:`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,points_frag:`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,shadow_vert:`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,shadow_frag:`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,sprite_vert:`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,sprite_frag:`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`},K={common:{diffuse:{value:new U(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Ge},alphaMap:{value:null},alphaMapTransform:{value:new Ge},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Ge}},envmap:{envMap:{value:null},envMapRotation:{value:new Ge},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Ge}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Ge}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Ge},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Ge},normalScale:{value:new z(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Ge},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Ge}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Ge}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Ge}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new U(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},sunLights:{value:[],properties:{direction:{},color:{}}},sunLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},sunShadowMatrix:{value:[]},sunShadowCascade:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new V},probesMax:{value:new V},probesResolution:{value:new V}},points:{diffuse:{value:new U(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Ge},alphaTest:{value:0},uvTransform:{value:new Ge}},sprite:{diffuse:{value:new U(16777215)},opacity:{value:1},center:{value:new z(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Ge},alphaMap:{value:null},alphaMapTransform:{value:new Ge},alphaTest:{value:0}}},$s={basic:{uniforms:$a([K.common,K.specularmap,K.envmap,K.aomap,K.lightmap,K.fog]),vertexShader:Qs.meshbasic_vert,fragmentShader:Qs.meshbasic_frag},lambert:{uniforms:$a([K.common,K.specularmap,K.envmap,K.aomap,K.lightmap,K.emissivemap,K.bumpmap,K.normalmap,K.displacementmap,K.fog,K.lights,{emissive:{value:new U(0)},envMapIntensity:{value:1}}]),vertexShader:Qs.meshlambert_vert,fragmentShader:Qs.meshlambert_frag},phong:{uniforms:$a([K.common,K.specularmap,K.envmap,K.aomap,K.lightmap,K.emissivemap,K.bumpmap,K.normalmap,K.displacementmap,K.fog,K.lights,{emissive:{value:new U(0)},specular:{value:new U(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:Qs.meshphong_vert,fragmentShader:Qs.meshphong_frag},standard:{uniforms:$a([K.common,K.envmap,K.aomap,K.lightmap,K.emissivemap,K.bumpmap,K.normalmap,K.displacementmap,K.roughnessmap,K.metalnessmap,K.fog,K.lights,{emissive:{value:new U(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Qs.meshphysical_vert,fragmentShader:Qs.meshphysical_frag},toon:{uniforms:$a([K.common,K.aomap,K.lightmap,K.emissivemap,K.bumpmap,K.normalmap,K.displacementmap,K.gradientmap,K.fog,K.lights,{emissive:{value:new U(0)}}]),vertexShader:Qs.meshtoon_vert,fragmentShader:Qs.meshtoon_frag},matcap:{uniforms:$a([K.common,K.bumpmap,K.normalmap,K.displacementmap,K.fog,{matcap:{value:null}}]),vertexShader:Qs.meshmatcap_vert,fragmentShader:Qs.meshmatcap_frag},points:{uniforms:$a([K.points,K.fog]),vertexShader:Qs.points_vert,fragmentShader:Qs.points_frag},dashed:{uniforms:$a([K.common,K.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Qs.linedashed_vert,fragmentShader:Qs.linedashed_frag},depth:{uniforms:$a([K.common,K.displacementmap]),vertexShader:Qs.depth_vert,fragmentShader:Qs.depth_frag},normal:{uniforms:$a([K.common,K.bumpmap,K.normalmap,K.displacementmap,{opacity:{value:1}}]),vertexShader:Qs.meshnormal_vert,fragmentShader:Qs.meshnormal_frag},sprite:{uniforms:$a([K.sprite,K.fog]),vertexShader:Qs.sprite_vert,fragmentShader:Qs.sprite_frag},background:{uniforms:{uvTransform:{value:new Ge},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Qs.background_vert,fragmentShader:Qs.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Ge}},vertexShader:Qs.backgroundCube_vert,fragmentShader:Qs.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Qs.cube_vert,fragmentShader:Qs.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Qs.equirect_vert,fragmentShader:Qs.equirect_frag},distance:{uniforms:$a([K.common,K.displacementmap,{referencePosition:{value:new V},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Qs.distance_vert,fragmentShader:Qs.distance_frag},shadow:{uniforms:$a([K.lights,K.fog,{color:{value:new U(0)},opacity:{value:1}}]),vertexShader:Qs.shadow_vert,fragmentShader:Qs.shadow_frag}};$s.physical={uniforms:$a([$s.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Ge},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Ge},clearcoatNormalScale:{value:new z(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Ge},dispersion:{value:0},retroreflectivity:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Ge},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Ge},sheen:{value:0},sheenColor:{value:new U(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Ge},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Ge},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Ge},transmissionSamplerSize:{value:new z},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Ge},attenuationDistance:{value:0},attenuationColor:{value:new U(0)},specularColor:{value:new U(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Ge},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Ge},anisotropyVector:{value:new z},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Ge}}]),vertexShader:Qs.meshphysical_vert,fragmentShader:Qs.meshphysical_frag};var ec={r:0,b:0,g:0},tc=new ft,nc=new Ge;nc.set(-1,0,0,0,1,0,0,0,1);function rc(e,t,n,r,i,a){let o=new U(0),s=i===!0?0:1,c,l,u=null,d=0,f=null;function p(e){let n=e.isScene===!0?e.background:null;if(n&&n.isTexture){let r=e.backgroundBlurriness>0;n=t.get(n,r)}return n}function m(t){let r=!1,i=p(t);i===null?g(o,s):i&&i.isColor&&(g(i,1),r=!0);let c=e.xr.getEnvironmentBlendMode();c===`additive`?n.buffers.color.setClear(0,0,0,1,a):c===`alpha-blend`&&n.buffers.color.setClear(0,0,0,0,a),(e.autoClear||r)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil))}function h(t,n){let i=p(n);i&&(i.isCubeTexture||i.mapping===306)?(l===void 0&&(l=new G(new _i(1,1,1),new oo({name:`BackgroundCubeMaterial`,uniforms:Qa($s.backgroundCube.uniforms),vertexShader:$s.backgroundCube.vertexShader,fragmentShader:$s.backgroundCube.fragmentShader,side:1,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute(`normal`),l.geometry.deleteAttribute(`uv`),l.onBeforeRender=function(e,t,n){this.matrixWorld.copyPosition(n.matrixWorld)},Object.defineProperty(l.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(l)),l.material.uniforms.envMap.value=i,l.material.uniforms.backgroundBlurriness.value=n.backgroundBlurriness,l.material.uniforms.backgroundIntensity.value=n.backgroundIntensity,l.material.uniforms.backgroundRotation.value.setFromMatrix4(tc.makeRotationFromEuler(n.backgroundRotation)).transpose(),i.isCubeTexture&&i.isRenderTargetTexture===!1&&l.material.uniforms.backgroundRotation.value.premultiply(nc),l.material.toneMapped=Xe.getTransfer(i.colorSpace)!==P,(u!==i||d!==i.version||f!==e.toneMapping)&&(l.material.needsUpdate=!0,u=i,d=i.version,f=e.toneMapping),l.layers.enableAll(),t.unshift(l,l.geometry,l.material,0,0,null)):i&&i.isTexture&&(c===void 0&&(c=new G(new Wa(2,2),new oo({name:`BackgroundMaterial`,uniforms:Qa($s.background.uniforms),vertexShader:$s.background.vertexShader,fragmentShader:$s.background.fragmentShader,side:0,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute(`normal`),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(c)),c.material.uniforms.t2D.value=i,c.material.uniforms.backgroundIntensity.value=n.backgroundIntensity,c.material.toneMapped=Xe.getTransfer(i.colorSpace)!==P,i.matrixAutoUpdate===!0&&i.updateMatrix(),c.material.uniforms.uvTransform.value.copy(i.matrix),(u!==i||d!==i.version||f!==e.toneMapping)&&(c.material.needsUpdate=!0,u=i,d=i.version,f=e.toneMapping),c.layers.enableAll(),t.unshift(c,c.geometry,c.material,0,0,null))}function g(t,r){t.getRGB(ec,no(e)),n.buffers.color.setClear(ec.r,ec.g,ec.b,r,a)}function _(){l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return o},setClearColor:function(e,t=1){o.set(e),s=t,g(o,s)},getClearAlpha:function(){return s},setClearAlpha:function(e){s=e,g(o,s)},render:m,addToRenderList:h,dispose:_}}function ic(e,t){let n=e.getParameter(e.MAX_VERTEX_ATTRIBS),r={},i=f(null),a=i,o=!1;function s(n,r,i,s,c){let u=!1,f=d(n,s,i,r);a!==f&&(a=f,l(a.object)),u=p(n,s,i,c),u&&m(n,s,i,c),c!==null&&t.update(c,e.ELEMENT_ARRAY_BUFFER),(u||o)&&(o=!1,b(n,r,i,s),c!==null&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,t.get(c).buffer))}function c(){return e.createVertexArray()}function l(t){return e.bindVertexArray(t)}function u(t){return e.deleteVertexArray(t)}function d(e,t,n,i){let a=i.wireframe===!0,o=r[t.id];o===void 0&&(o={},r[t.id]=o);let s=e.isInstancedMesh===!0?e.id:0,l=o[s];l===void 0&&(l={},o[s]=l);let u=l[n.id];u===void 0&&(u={},l[n.id]=u);let d=u[a];return d===void 0&&(d=f(c()),u[a]=d),d}function f(e){let t=[],r=[],i=[];for(let e=0;e<n;e++)t[e]=0,r[e]=0,i[e]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:t,enabledAttributes:r,attributeDivisors:i,object:e,attributes:{},index:null}}function p(e,t,n,r){let i=a.attributes,o=t.attributes,s=0,c=n.getAttributes();for(let t in c)if(c[t].location>=0){let n=i[t],r=o[t];if(r===void 0&&(t===`instanceMatrix`&&e.instanceMatrix&&(r=e.instanceMatrix),t===`instanceColor`&&e.instanceColor&&(r=e.instanceColor)),n===void 0||n.attribute!==r||r&&n.data!==r.data)return!0;s++}return a.attributesNum!==s||a.index!==r}function m(e,t,n,r){let i={},o=t.attributes,s=0,c=n.getAttributes();for(let t in c)if(c[t].location>=0){let n=o[t];n===void 0&&(t===`instanceMatrix`&&e.instanceMatrix&&(n=e.instanceMatrix),t===`instanceColor`&&e.instanceColor&&(n=e.instanceColor));let r={};r.attribute=n,n&&n.data&&(r.data=n.data),i[t]=r,s++}a.attributes=i,a.attributesNum=s,a.index=r}function h(){let e=a.newAttributes;for(let t=0,n=e.length;t<n;t++)e[t]=0}function g(e){_(e,0)}function _(t,n){let r=a.newAttributes,i=a.enabledAttributes,o=a.attributeDivisors;r[t]=1,i[t]===0&&(e.enableVertexAttribArray(t),i[t]=1),o[t]!==n&&(e.vertexAttribDivisor(t,n),o[t]=n)}function v(){let t=a.newAttributes,n=a.enabledAttributes;for(let r=0,i=n.length;r<i;r++)n[r]!==t[r]&&(e.disableVertexAttribArray(r),n[r]=0)}function y(t,n,r,i,a,o,s){s===!0?e.vertexAttribIPointer(t,n,r,a,o):e.vertexAttribPointer(t,n,r,i,a,o)}function b(n,r,i,a){h();let o=a.attributes,s=i.getAttributes(),c=r.defaultAttributeValues;for(let r in s){let i=s[r];if(i.location>=0){let s=o[r];if(s===void 0&&(r===`instanceMatrix`&&n.instanceMatrix&&(s=n.instanceMatrix),r===`instanceColor`&&n.instanceColor&&(s=n.instanceColor)),s!==void 0){let r=s.normalized,o=s.itemSize,c=t.get(s);if(c===void 0)continue;let l=c.buffer,u=c.type,d=c.bytesPerElement,f=u===e.INT||u===e.UNSIGNED_INT||s.gpuType===1013;if(s.isInterleavedBufferAttribute){let t=s.data,c=t.stride,p=s.offset;if(t.isInstancedInterleavedBuffer){for(let e=0;e<i.locationSize;e++)_(i.location+e,t.meshPerAttribute);n.isInstancedMesh!==!0&&a._maxInstanceCount===void 0&&(a._maxInstanceCount=t.meshPerAttribute*t.count)}else for(let e=0;e<i.locationSize;e++)g(i.location+e);e.bindBuffer(e.ARRAY_BUFFER,l);for(let e=0;e<i.locationSize;e++)y(i.location+e,o/i.locationSize,u,r,c*d,(p+o/i.locationSize*e)*d,f)}else{if(s.isInstancedBufferAttribute){for(let e=0;e<i.locationSize;e++)_(i.location+e,s.meshPerAttribute);n.isInstancedMesh!==!0&&a._maxInstanceCount===void 0&&(a._maxInstanceCount=s.meshPerAttribute*s.count)}else for(let e=0;e<i.locationSize;e++)g(i.location+e);e.bindBuffer(e.ARRAY_BUFFER,l);for(let e=0;e<i.locationSize;e++)y(i.location+e,o/i.locationSize,u,r,o*d,o/i.locationSize*e*d,f)}}else if(c!==void 0){let t=c[r];if(t!==void 0)switch(t.length){case 2:e.vertexAttrib2fv(i.location,t);break;case 3:e.vertexAttrib3fv(i.location,t);break;case 4:e.vertexAttrib4fv(i.location,t);break;default:e.vertexAttrib1fv(i.location,t)}}}}v()}function x(){T();for(let e in r){let t=r[e];for(let e in t){let n=t[e];for(let e in n){let t=n[e];for(let e in t)u(t[e].object),delete t[e];delete n[e]}}delete r[e]}}function S(e){if(r[e.id]===void 0)return;let t=r[e.id];for(let e in t){let n=t[e];for(let e in n){let t=n[e];for(let e in t)u(t[e].object),delete t[e];delete n[e]}}delete r[e.id]}function C(e){for(let t in r){let n=r[t];for(let t in n){let r=n[t];if(r[e.id]===void 0)continue;let i=r[e.id];for(let e in i)u(i[e].object),delete i[e];delete r[e.id]}}}function w(e){for(let t in r){let n=r[t],i=e.isInstancedMesh===!0?e.id:0,a=n[i];if(a!==void 0){for(let e in a){let t=a[e];for(let e in t)u(t[e].object),delete t[e];delete a[e]}delete n[i],Object.keys(n).length===0&&delete r[t]}}}function T(){E(),o=!0,a!==i&&(a=i,l(a.object))}function E(){i.geometry=null,i.program=null,i.wireframe=!1}return{setup:s,reset:T,resetDefaultState:E,dispose:x,releaseStatesOfGeometry:S,releaseStatesOfObject:w,releaseStatesOfProgram:C,initAttributes:h,enableAttribute:g,disableUnusedAttributes:v}}function ac(e,t,n){let r;function i(e){r=e}function a(t,i){e.drawArrays(r,t,i),n.update(i,r,1)}function o(t,i,a){a!==0&&(e.drawArraysInstanced(r,t,i,a),n.update(i,r,a))}function s(e,i,a){if(a===0)return;t.get(`WEBGL_multi_draw`).multiDrawArraysWEBGL(r,e,0,i,0,a);let o=0;for(let e=0;e<a;e++)o+=i[e];n.update(o,r,1)}this.setMode=i,this.render=a,this.renderInstances=o,this.renderMultiDraw=s}function oc(e,t,n,r){let i;function a(){if(i!==void 0)return i;if(t.has(`EXT_texture_filter_anisotropic`)===!0){let n=t.get(`EXT_texture_filter_anisotropic`);i=e.getParameter(n.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else i=0;return i}function o(t){return t===1023||r.convert(t)===e.getParameter(e.IMPLEMENTATION_COLOR_READ_FORMAT)}function s(n){let i=n===1016&&(t.has(`EXT_color_buffer_half_float`)||t.has(`EXT_color_buffer_float`));return!(n!==1009&&n!==1015&&!i&&r.convert(n)!==e.getParameter(e.IMPLEMENTATION_COLOR_READ_TYPE))}function c(t){if(t===`highp`){if(e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.HIGH_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.HIGH_FLOAT).precision>0)return`highp`;t=`mediump`}return t===`mediump`&&e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.MEDIUM_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.MEDIUM_FLOAT).precision>0?`mediump`:`lowp`}let l=n.precision===void 0?`highp`:n.precision,u=c(l);u!==l&&(F(`WebGLRenderer:`,l,`not supported, using`,u,`instead.`),l=u);let d=n.logarithmicDepthBuffer===!0,f=n.reversedDepthBuffer===!0&&t.has(`EXT_clip_control`);n.reversedDepthBuffer===!0&&f===!1&&F(`WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.`);let p=e.getParameter(e.MAX_TEXTURE_IMAGE_UNITS),m=e.getParameter(e.MAX_VERTEX_TEXTURE_IMAGE_UNITS),h=e.getParameter(e.MAX_TEXTURE_SIZE),g=e.getParameter(e.MAX_CUBE_MAP_TEXTURE_SIZE),_=e.getParameter(e.MAX_VERTEX_ATTRIBS),v=e.getParameter(e.MAX_VERTEX_UNIFORM_VECTORS),y=e.getParameter(e.MAX_VARYING_VECTORS),b=e.getParameter(e.MAX_FRAGMENT_UNIFORM_VECTORS),x=e.getParameter(e.MAX_SAMPLES),S=e.getParameter(e.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:a,getMaxPrecision:c,textureFormatReadable:o,textureTypeReadable:s,precision:l,logarithmicDepthBuffer:d,reversedDepthBuffer:f,maxTextures:p,maxVertexTextures:m,maxTextureSize:h,maxCubemapSize:g,maxAttributes:_,maxVertexUniforms:v,maxVaryings:y,maxFragmentUniforms:b,maxSamples:x,samples:S}}function sc(e){let t=this,n=null,r=0,i=!1,a=!1,o=new Yn,s=new Ge,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(e,t){let n=e.length!==0||t||r!==0||i;return i=t,r=e.length,n},this.beginShadows=function(){a=!0,u(null)},this.endShadows=function(){a=!1},this.setGlobalState=function(e,t){n=u(e,t,0)},this.setState=function(t,o,s){let d=t.clippingPlanes,f=t.clipIntersection,p=t.clipShadows,m=e.get(t);if(!i||d===null||d.length===0||a&&!p)a?u(null):l();else{let e=a?0:r,t=e*4,i=m.clippingState||null;c.value=i,i=u(d,o,t,s);for(let e=0;e!==t;++e)i[e]=n[e];m.clippingState=i,this.numIntersection=f?this.numPlanes:0,this.numPlanes+=e}};function l(){c.value!==n&&(c.value=n,c.needsUpdate=r>0),t.numPlanes=r,t.numIntersection=0}function u(e,n,r,i){let a=e===null?0:e.length,l=null;if(a!==0){if(l=c.value,i!==!0||l===null){let t=r+a*4,i=n.matrixWorldInverse;s.getNormalMatrix(i),(l===null||l.length<t)&&(l=new Float32Array(t));for(let t=0,n=r;t!==a;++t,n+=4)o.copy(e[t]).applyMatrix4(i,s),o.normal.toArray(l,n),l[n+3]=o.constant}c.value=l,c.needsUpdate=!0}return t.numPlanes=a,t.numIntersection=0,l}}var cc=4,lc=6,uc=20,dc=256,fc=new hs,pc=new U,mc=null,hc=0,gc=0,_c=!1,vc=new V,yc=new V,bc=class{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,n=.1,r=100,i={}){let{size:a=256,position:o=vc}=i;mc=this._renderer.getRenderTarget(),hc=this._renderer.getActiveCubeFace(),gc=this._renderer.getActiveMipmapLevel(),_c=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(a);let s=this._allocateTargets();return s.depthBuffer=!0,this._sceneToCubeUV(e,n,r,s,o),t>0&&this._blur(s,0,0,t),this._applyPMREM(s),this._cleanup(s),s}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Dc(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Ec(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=2**this._lodMax}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(mc,hc,gc),this._renderer.xr.enabled=_c,e.scissorTest=!1,Cc(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===301||e.mapping===302?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),mc=this._renderer.getRenderTarget(),hc=this._renderer.getActiveCubeFace(),gc=this._renderer.getActiveMipmapLevel(),_c=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){let e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:o,minFilter:o,generateMipmaps:!1,type:p,format:_,colorSpace:te,depthBuffer:!1},r=Sc(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Sc(e,t,n);let{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods}=xc(r)),this._blurMaterial=Tc(r,e,t),this._ggxMaterial=wc(r,e,t)}return r}_compileMaterial(e){let t=new G(new Hn,e);this._renderer.compile(t,fc)}_sceneToCubeUV(e,t,n,r,i){let a=new us(90,1,t,n),o=[1,-1,1,1,1,1],s=[1,1,1,-1,-1,-1],c=this._renderer,l=c.autoClear,u=c.toneMapping;c.getClearColor(pc),c.toneMapping=0,c.autoClear=!1,c.state.buffers.depth.getReversed()&&(c.setRenderTarget(r),c.clearDepth(),c.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new G(new _i,new rr({name:`PMREM.Background`,side:1,depthWrite:!1,depthTest:!1})));let d=this._backgroundBox,f=d.material,p=!1,m=e.background;m?m.isColor&&(f.color.copy(m),e.background=null,p=!0):(f.color.copy(pc),p=!0);for(let t=0;t<6;t++){let n=t%3;n===0?(a.up.set(0,o[t],0),a.position.set(i.x,i.y,i.z),a.lookAt(i.x+s[t],i.y,i.z)):n===1?(a.up.set(0,0,o[t]),a.position.set(i.x,i.y,i.z),a.lookAt(i.x,i.y+s[t],i.z)):(a.up.set(0,o[t],0),a.position.set(i.x,i.y,i.z),a.lookAt(i.x,i.y,i.z+s[t]));let l=this._cubeSize;Cc(r,n*l,t>2?l:0,l,l),c.setRenderTarget(r),p&&c.render(d,a),c.render(e,a)}c.toneMapping=u,c.autoClear=l,e.background=m}_textureToCubeUV(e,t){let n=this._renderer,r=e.mapping===301||e.mapping===302;r?(this._cubemapMaterial===null&&(this._cubemapMaterial=Dc()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Ec());let i=r?this._cubemapMaterial:this._equirectMaterial,a=this._lodMeshes[0];a.material=i;let o=i.uniforms;o.envMap.value=e;let s=this._cubeSize;Cc(t,0,0,3*s,2*s),n.setRenderTarget(t),n.render(a,fc)}_applyPMREM(e){let t=this._renderer,n=t.autoClear;t.autoClear=!1;let r=this._lodMeshes.length;for(let t=1;t<r;t++)this._applyGGXFilter(e,t-1,t);t.autoClear=n}_applyGGXFilter(e,t,n){let r=this._renderer,i=this._pingPongRenderTarget,a=this._ggxMaterial,o=this._lodMeshes[n];o.material=a;let s=a.uniforms,c=n/(this._lodMeshes.length-1),l=t/(this._lodMeshes.length-1),u=Math.sqrt(c*c-l*l)*(c*1.25),{_lodMax:d}=this,f=this._sizeLods[n],p=3*f*(n>d-cc?n-d+cc:0),m=4*(this._cubeSize-f);s.envMap.value=e.texture,s.roughness.value=u,s.mipInt.value=d-t,Cc(i,p,m,3*f,2*f),r.setRenderTarget(i),r.render(o,fc),s.envMap.value=i.texture,s.roughness.value=0,s.mipInt.value=d-n,Cc(e,p,m,3*f,2*f),r.setRenderTarget(e),r.render(o,fc)}_blur(e,t,n,r){let i=this._pingPongRenderTarget,a=Math.min(r,Math.PI)/Math.SQRT2;this._blurPass(e,i,t,n,a),this._blurPass(i,e,n,n,a)}_blurPass(e,t,n,r,i){let a=this._renderer,o=this._blurMaterial,s=this._lodMeshes[r];s.material=o;let c=o.uniforms;c.envMap.value=e.texture,c.sigma.value=i,c.mipInt.value=this._lodMax-n;let l=this._sizeLods[r];Cc(t,3*l*(r>this._lodMax-cc?r-this._lodMax+cc:0),4*(this._cubeSize-l),3*l,2*l),a.setRenderTarget(t),a.render(s,fc)}};function xc(e){let t=[],n=[],r=e,i=e-cc+1+lc;for(let e=0;e<i;e++){let e=2**r;t.push(e);let i=1/(e-2),a=-i,o=1+i,s=[a,a,o,a,o,o,a,a,o,o,a,o],c=new Float32Array(108),l=new Float32Array(108);for(let e=0;e<6;e++){let t=e%3*2/3-1,n=e>2?0:-1,r=[t,n,0,t+2/3,n,0,t+2/3,n+1,0,t,n,0,t+2/3,n+1,0,t,n+1,0];c.set(r,18*e);for(let t=0;t<6;t++){let n=s[t*2]*2-1,r=s[t*2+1]*2-1;e===0?yc.set(1,r,n):e===1?yc.set(-n,1,-r):e===2?yc.set(-n,r,1):e===3?yc.set(-1,r,-n):e===4?yc.set(-n,-1,r):yc.set(n,r,-1),yc.toArray(l,(e*6+t)*3)}}let u=new Hn;u.setAttribute(`position`,new On(c,3)),u.setAttribute(`outputDirection`,new On(l,3)),n.push(new G(u,null)),r>cc&&r--}return{lodMeshes:n,sizeLods:t}}function Sc(e,t,n){let r=new lt(e,t,n);return r.texture.mapping=306,r.texture.name=`PMREM.cubeUv`,r.scissorTest=!0,r}function Cc(e,t,n,r,i){e.viewport.set(t,n,r,i),e.scissor.set(t,n,r,i)}function wc(e,t,n){return new oo({name:`PMREMGGXConvolution`,defines:{GGX_SAMPLES:dc,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/n,CUBEUV_MAX_MIP:`${e}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:Oc(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 4.1: Orthonormal basis
				vec3 T1 = vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(V, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + V.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function Tc(e,t,n){return new oo({name:`SphericalGaussianBlur`,defines:{SAMPLES:uc,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/n,CUBEUV_MAX_MIP:`${e}.0`},uniforms:{envMap:{value:null},sigma:{value:0},mipInt:{value:0}},vertexShader:Oc(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float sigma;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359
			#define GOLDEN_ANGLE 2.39996322973

			void main() {

				if ( sigma == 0.0 ) {

					gl_FragColor = vec4( bilinearCubeUV( envMap, vOutputDirection, mipInt ), 1.0 );
					return;

				}

				vec3 outputDirection = normalize( vOutputDirection );

				vec3 up = abs( outputDirection.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
				vec3 tangent = normalize( cross( up, outputDirection ) );
				vec3 bitangent = cross( outputDirection, tangent );

				// Truncate the kernel at three standard deviations or at the antipode.
				float thetaMax = min( 3.0 * sigma, PI );
				float truncation = 1.0 - exp( - 0.5 * thetaMax * thetaMax / ( sigma * sigma ) );

				vec3 accumColor = vec3( 0.0 );
				float accumWeight = 0.0;

				for ( int i = 0; i < SAMPLES; i ++ ) {

					// Stratified inverse-CDF sampling of the Gaussian, placed on a golden-angle spiral.
					float stratum = ( float( i ) + 0.5 ) / float( SAMPLES );
					float theta = sigma * sqrt( - 2.0 * log( 1.0 - stratum * truncation ) );
					float phi = float( i ) * GOLDEN_ANGLE;

					vec3 offset = cos( phi ) * tangent + sin( phi ) * bitangent;
					vec3 sampleDirection = cos( theta ) * outputDirection + sin( theta ) * offset;

					// Correct the planar sample density to solid angle.
					float weight = sin( theta ) / theta;

					accumColor += weight * bilinearCubeUV( envMap, sampleDirection, mipInt );
					accumWeight += weight;

				}

				gl_FragColor = vec4( accumColor / accumWeight, 1.0 );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function Ec(){return new oo({name:`EquirectangularToCubeUV`,uniforms:{envMap:{value:null}},vertexShader:Oc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function Dc(){return new oo({name:`CubemapToCubeUV`,uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Oc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function Oc(){return`

		precision mediump float;
		precision mediump int;

		attribute vec3 outputDirection;

		varying vec3 vOutputDirection;

		void main() {

			vOutputDirection = outputDirection;
			gl_Position = vec4( position, 1.0 );

		}
	`}var kc=class extends lt{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;let n={width:e,height:e,depth:1},r=[n,n,n,n,n,n];this.texture=new fi(r),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},r=new _i(5,5,5),i=new oo({name:`CubemapFromEquirect`,uniforms:Qa(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:1,blending:0});i.uniforms.tEquirect.value=t;let a=new G(r,i),s=t.minFilter;return t.minFilter===1008&&(t.minFilter=o),new ws(1,10,this).update(e,a),t.minFilter=s,a.geometry.dispose(),a.material.dispose(),this}clear(e,t=!0,n=!0,r=!0){let i=e.getRenderTarget();for(let i=0;i<6;i++)e.setRenderTarget(this,i),e.clear(t,n,r);e.setRenderTarget(i)}};function Ac(e){let t=new WeakMap,n=new WeakMap,r=null;function i(e,t=!1){return e==null?null:t?o(e):a(e)}function a(n){if(n&&n.isTexture){let r=n.mapping;if(r===303||r===304){if(t.has(n)){let e=t.get(n).texture;return s(e,n.mapping)}{let r=n.image;if(r&&r.height>0){let i=new kc(r.height);return i.fromEquirectangularTexture(e,n),t.set(n,i),n.addEventListener(`dispose`,l),s(i.texture,n.mapping)}return null}}}return n}function o(t){if(t&&t.isTexture){let i=t.mapping,a=i===303||i===304,o=i===301||i===302;if(a||o){let i=n.get(t),s=i===void 0?0:i.texture.pmremVersion;if(t.isRenderTargetTexture&&t.pmremVersion!==s)return r===null&&(r=new bc(e)),i=a?r.fromEquirectangular(t,i):r.fromCubemap(t,i),i.texture.pmremVersion=t.pmremVersion,n.set(t,i),i.texture;if(i!==void 0)return i.texture;{let s=t.image;return a&&s&&s.height>0||o&&s&&c(s)?(r===null&&(r=new bc(e)),i=a?r.fromEquirectangular(t):r.fromCubemap(t),i.texture.pmremVersion=t.pmremVersion,n.set(t,i),t.addEventListener(`dispose`,u),i.texture):null}}}return t}function s(e,t){return t===303?e.mapping=301:t===304&&(e.mapping=302),e}function c(e){let t=0;for(let n=0;n<6;n++)e[n]!==void 0&&t++;return t===6}function l(e){let n=e.target;n.removeEventListener(`dispose`,l);let r=t.get(n);r!==void 0&&(t.delete(n),r.dispose())}function u(e){let t=e.target;t.removeEventListener(`dispose`,u);let r=n.get(t);r!==void 0&&(n.delete(t),r.dispose())}function d(){t=new WeakMap,n=new WeakMap,r!==null&&(r.dispose(),r=null)}return{get:i,dispose:d}}function jc(e){let t={};function n(n){if(t[n]!==void 0)return t[n];let r=e.getExtension(n);return t[n]=r,r}return{has:function(e){return n(e)!==null},init:function(){n(`EXT_color_buffer_float`),n(`WEBGL_clip_cull_distance`),n(`OES_texture_float_linear`),n(`EXT_color_buffer_half_float`),n(`WEBGL_multisampled_render_to_texture`),n(`WEBGL_render_shared_exponent`)},get:function(e){let t=n(e);return t===null&&he(`WebGLRenderer: `+e+` extension not supported.`),t}}}function Mc(e,t,n,r){let i={},a=new WeakMap;function o(e){let s=e.target;s.index!==null&&t.remove(s.index);for(let e in s.attributes)t.remove(s.attributes[e]);s.removeEventListener(`dispose`,o),delete i[s.id];let c=a.get(s);c&&(t.remove(c),a.delete(s)),r.releaseStatesOfGeometry(s),s.isInstancedBufferGeometry===!0&&delete s._maxInstanceCount,n.memory.geometries--}function s(e,t){return i[t.id]===!0?t:(t.addEventListener(`dispose`,o),i[t.id]=!0,n.memory.geometries++,t)}function c(n){let r=n.attributes;for(let n in r)t.update(r[n],e.ARRAY_BUFFER)}function l(e){let n=[],r=e.index,i=e.attributes.position,o=0;if(i===void 0)return;if(r!==null){let e=r.array;o=r.version;for(let t=0,r=e.length;t<r;t+=3){let r=e[t+0],i=e[t+1],a=e[t+2];n.push(r,i,i,a,a,r)}}else{let e=i.array;o=i.version;for(let t=0,r=e.length/3-1;t<r;t+=3){let e=t+0,r=t+1,i=t+2;n.push(e,r,r,i,i,e)}}let s=new(i.count>=65535?An:kn)(n,1);s.version=o;let c=a.get(e);c&&t.remove(c),a.set(e,s)}function u(e){let t=a.get(e);if(t){let n=e.index;n!==null&&t.version<n.version&&l(e)}else l(e);return a.get(e)}return{get:s,update:c,getWireframeAttribute:u}}function Nc(e,t,n){let r;function i(e){r=e}let a,o;function s(e){a=e.type,o=e.bytesPerElement}function c(t,i){e.drawElements(r,i,a,t*o),n.update(i,r,1)}function l(t,i,s){s!==0&&(e.drawElementsInstanced(r,i,a,t*o,s),n.update(i,r,s))}function u(e,i,o){if(o===0)return;t.get(`WEBGL_multi_draw`).multiDrawElementsWEBGL(r,i,0,a,e,0,o);let s=0;for(let e=0;e<o;e++)s+=i[e];n.update(s,r,1)}this.setMode=i,this.setIndex=s,this.render=c,this.renderInstances=l,this.renderMultiDraw=u}function Pc(e){let t={geometries:0,textures:0},n={frame:0,calls:0,triangles:0,points:0,lines:0};function r(t,r,i){switch(n.calls++,r){case e.TRIANGLES:n.triangles+=t/3*i;break;case e.LINES:n.lines+=t/2*i;break;case e.LINE_STRIP:n.lines+=i*(t-1);break;case e.LINE_LOOP:n.lines+=i*t;break;case e.POINTS:n.points+=i*t;break;default:me(`WebGLInfo: Unknown draw mode:`,r)}}function i(){n.calls=0,n.triangles=0,n.points=0,n.lines=0}return{memory:t,render:n,programs:null,autoReset:!0,reset:i,update:r}}function Fc(e,t,n){let r=new WeakMap,i=new st;function a(a,o,s){let c=a.morphTargetInfluences,l=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,u=l===void 0?0:l.length,d=r.get(o);if(d===void 0||d.count!==u){d!==void 0&&d.texture.dispose();let e=o.morphAttributes.position!==void 0,n=o.morphAttributes.normal!==void 0,a=o.morphAttributes.color!==void 0,s=o.morphAttributes.position||[],c=o.morphAttributes.normal||[],l=o.morphAttributes.color||[],p=0;e===!0&&(p=1),n===!0&&(p=2),a===!0&&(p=3);let m=o.attributes.position.count*p,h=1;m>t.maxTextureSize&&(h=Math.ceil(m/t.maxTextureSize),m=t.maxTextureSize);let g=new Float32Array(m*h*4*u),_=new ut(g,m,h,u);_.type=f,_.needsUpdate=!0;let v=p*4;for(let t=0;t<u;t++){let r=s[t],o=c[t],u=l[t],d=m*h*4*t;for(let t=0;t<r.count;t++){let s=t*v;e===!0&&(i.fromBufferAttribute(r,t),g[d+s+0]=i.x,g[d+s+1]=i.y,g[d+s+2]=i.z,g[d+s+3]=0),n===!0&&(i.fromBufferAttribute(o,t),g[d+s+4]=i.x,g[d+s+5]=i.y,g[d+s+6]=i.z,g[d+s+7]=0),a===!0&&(i.fromBufferAttribute(u,t),g[d+s+8]=i.x,g[d+s+9]=i.y,g[d+s+10]=i.z,g[d+s+11]=u.itemSize===4?i.w:1)}}d={count:u,texture:_,size:new z(m,h)},r.set(o,d);function y(){_.dispose(),r.delete(o),o.removeEventListener(`dispose`,y)}o.addEventListener(`dispose`,y)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)s.getUniforms().setValue(e,`morphTexture`,a.morphTexture,n);else{let t=0;for(let e=0;e<c.length;e++)t+=c[e];let n=o.morphTargetsRelative?1:1-t;s.getUniforms().setValue(e,`morphTargetBaseInfluence`,n),s.getUniforms().setValue(e,`morphTargetInfluences`,c)}s.getUniforms().setValue(e,`morphTargetsTexture`,d.texture,n),s.getUniforms().setValue(e,`morphTargetsTextureSize`,d.size)}return{update:a}}function Ic(e,t,n,r,i){let a=new WeakMap;function o(r){let o=i.render.frame,s=r.geometry,l=t.get(r,s);if(a.get(l)!==o&&(t.update(l),a.set(l,o)),r.isInstancedMesh&&(r.hasEventListener(`dispose`,c)===!1&&r.addEventListener(`dispose`,c),a.get(r)!==o&&(n.update(r.instanceMatrix,e.ARRAY_BUFFER),r.instanceColor!==null&&n.update(r.instanceColor,e.ARRAY_BUFFER),a.set(r,o))),r.isSkinnedMesh){let e=r.skeleton;a.get(e)!==o&&(e.update(),a.set(e,o))}return l}function s(){a=new WeakMap}function c(e){let t=e.target;t.removeEventListener(`dispose`,c),r.releaseStatesOfObject(t),n.remove(t.instanceMatrix),t.instanceColor!==null&&n.remove(t.instanceColor)}return{update:o,dispose:s}}var Lc={1:`LINEAR_TONE_MAPPING`,2:`REINHARD_TONE_MAPPING`,3:`CINEON_TONE_MAPPING`,4:`ACES_FILMIC_TONE_MAPPING`,6:`AGX_TONE_MAPPING`,7:`NEUTRAL_TONE_MAPPING`,5:`CUSTOM_TONE_MAPPING`};function Rc(e,t,n,r,i,a){let o=new lt(t,n,{type:e,depthBuffer:i,stencilBuffer:a,samples:r?4:0,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,resolveDepthBuffer:!1,resolveStencilBuffer:!1}),s=null,c=null,l=new Hn;l.setAttribute(`position`,new W([-1,3,0,-1,-1,0,3,-1,0],3)),l.setAttribute(`uv`,new W([0,2,0,0,2,0],2));let u=new so({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),d=new G(l,u),f=new hs(-1,1,1,-1,0,1),m=null,h=null,g=!1,_,v=null,y=[],b=!1;this.setSize=function(e,t){o.setSize(e,t),s!==null&&s.setSize(e,t),c!==null&&c.setSize(e,t);for(let n=0;n<y.length;n++){let r=y[n];r.setSize&&r.setSize(e,t)}},this.setEffects=function(e){y=e,b=y.length>0&&y[0].isRenderPass===!0;let t=o.width,n=o.height;y.length>0&&s===null&&(s=new lt(t,n,{type:p,depthBuffer:!1,stencilBuffer:!1}),c=new lt(t,n,{type:p,depthBuffer:!1,stencilBuffer:!1}));for(let e=0;e<y.length;e++){let r=y[e];r.setSize&&r.setSize(t,n)}},this.begin=function(e,t){if(g||e.toneMapping===0&&y.length===0)return!1;if(v=t,t!==null){let e=t.width,n=t.height;(o.width!==e||o.height!==n)&&this.setSize(e,n)}return b===!1&&e.setRenderTarget(o),_=e.toneMapping,e.toneMapping=0,!0},this.hasRenderPass=function(){return b},this.end=function(e,t){e.toneMapping=_,g=!0;let n=o,r=s;for(let i=0;i<y.length;i++){let a=y[i];a.enabled!==!1&&(a.render(e,r,n,t),a.needsSwap!==!1&&(n=r,r=r===s?c:s))}if(m!==e.outputColorSpace||h!==e.toneMapping){m=e.outputColorSpace,h=e.toneMapping,u.defines={},Xe.getTransfer(m)===`srgb`&&(u.defines.SRGB_TRANSFER=``);let t=Lc[h];t&&(u.defines[t]=``),u.needsUpdate=!0}u.uniforms.tDiffuse.value=n.texture,e.setRenderTarget(v),e.render(d,f),v=null,g=!1},this.isCompositing=function(){return g},this.dispose=function(){o.dispose(),s!==null&&s.dispose(),c!==null&&c.dispose(),l.dispose(),u.dispose()}}var zc=new ot,Bc=new mi(1,1),Vc=new ut,Hc=new dt,Uc=new fi,Wc=[],Gc=[],Kc=new Float32Array(16),qc=new Float32Array(9),Jc=new Float32Array(4);function Yc(e,t,n){let r=e[0];if(r<=0||r>0)return e;let i=t*n,a=Wc[i];if(a===void 0&&(a=new Float32Array(i),Wc[i]=a),t!==0){r.toArray(a,0);for(let r=1,i=0;r!==t;++r)i+=n,e[r].toArray(a,i)}return a}function Xc(e,t){if(e.length!==t.length)return!1;for(let n=0,r=e.length;n<r;n++)if(e[n]!==t[n])return!1;return!0}function Zc(e,t){for(let n=0,r=t.length;n<r;n++)e[n]=t[n]}function Qc(e,t){let n=Gc[t];n===void 0&&(n=new Int32Array(t),Gc[t]=n);for(let r=0;r!==t;++r)n[r]=e.allocateTextureUnit();return n}function $c(e,t){let n=this.cache;n[0]!==t&&(e.uniform1f(this.addr,t),n[0]=t)}function el(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2f(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(Xc(n,t))return;e.uniform2fv(this.addr,t),Zc(n,t)}}function tl(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3f(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else if(t.r!==void 0)(n[0]!==t.r||n[1]!==t.g||n[2]!==t.b)&&(e.uniform3f(this.addr,t.r,t.g,t.b),n[0]=t.r,n[1]=t.g,n[2]=t.b);else{if(Xc(n,t))return;e.uniform3fv(this.addr,t),Zc(n,t)}}function nl(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4f(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(Xc(n,t))return;e.uniform4fv(this.addr,t),Zc(n,t)}}function rl(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(Xc(n,t))return;e.uniformMatrix2fv(this.addr,!1,t),Zc(n,t)}else{if(Xc(n,r))return;Jc.set(r),e.uniformMatrix2fv(this.addr,!1,Jc),Zc(n,r)}}function il(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(Xc(n,t))return;e.uniformMatrix3fv(this.addr,!1,t),Zc(n,t)}else{if(Xc(n,r))return;qc.set(r),e.uniformMatrix3fv(this.addr,!1,qc),Zc(n,r)}}function al(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(Xc(n,t))return;e.uniformMatrix4fv(this.addr,!1,t),Zc(n,t)}else{if(Xc(n,r))return;Kc.set(r),e.uniformMatrix4fv(this.addr,!1,Kc),Zc(n,r)}}function ol(e,t){let n=this.cache;n[0]!==t&&(e.uniform1i(this.addr,t),n[0]=t)}function sl(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2i(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(Xc(n,t))return;e.uniform2iv(this.addr,t),Zc(n,t)}}function cl(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3i(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(Xc(n,t))return;e.uniform3iv(this.addr,t),Zc(n,t)}}function ll(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4i(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(Xc(n,t))return;e.uniform4iv(this.addr,t),Zc(n,t)}}function ul(e,t){let n=this.cache;n[0]!==t&&(e.uniform1ui(this.addr,t),n[0]=t)}function dl(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2ui(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(Xc(n,t))return;e.uniform2uiv(this.addr,t),Zc(n,t)}}function fl(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3ui(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(Xc(n,t))return;e.uniform3uiv(this.addr,t),Zc(n,t)}}function pl(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4ui(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(Xc(n,t))return;e.uniform4uiv(this.addr,t),Zc(n,t)}}function ml(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i);let a;this.type===e.SAMPLER_2D_SHADOW?(Bc.compareFunction=n.isReversedDepthBuffer()?518:515,a=Bc):a=zc,n.setTexture2D(t||a,i)}function hl(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTexture3D(t||Hc,i)}function gl(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTextureCube(t||Uc,i)}function _l(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTexture2DArray(t||Vc,i)}function vl(e){switch(e){case 5126:return $c;case 35664:return el;case 35665:return tl;case 35666:return nl;case 35674:return rl;case 35675:return il;case 35676:return al;case 5124:case 35670:return ol;case 35667:case 35671:return sl;case 35668:case 35672:return cl;case 35669:case 35673:return ll;case 5125:return ul;case 36294:return dl;case 36295:return fl;case 36296:return pl;case 35678:case 36198:case 36298:case 36306:case 35682:return ml;case 35679:case 36299:case 36307:return hl;case 35680:case 36300:case 36308:case 36293:return gl;case 36289:case 36303:case 36311:case 36292:return _l}}function yl(e,t){e.uniform1fv(this.addr,t)}function bl(e,t){let n=Yc(t,this.size,2);e.uniform2fv(this.addr,n)}function xl(e,t){let n=Yc(t,this.size,3);e.uniform3fv(this.addr,n)}function Sl(e,t){let n=Yc(t,this.size,4);e.uniform4fv(this.addr,n)}function Cl(e,t){let n=Yc(t,this.size,4);e.uniformMatrix2fv(this.addr,!1,n)}function wl(e,t){let n=Yc(t,this.size,9);e.uniformMatrix3fv(this.addr,!1,n)}function Tl(e,t){let n=Yc(t,this.size,16);e.uniformMatrix4fv(this.addr,!1,n)}function El(e,t){e.uniform1iv(this.addr,t)}function Dl(e,t){e.uniform2iv(this.addr,t)}function Ol(e,t){e.uniform3iv(this.addr,t)}function kl(e,t){e.uniform4iv(this.addr,t)}function Al(e,t){e.uniform1uiv(this.addr,t)}function jl(e,t){e.uniform2uiv(this.addr,t)}function Ml(e,t){e.uniform3uiv(this.addr,t)}function Nl(e,t){e.uniform4uiv(this.addr,t)}function Pl(e,t,n){let r=this.cache,i=t.length,a=Qc(n,i);Xc(r,a)||(e.uniform1iv(this.addr,a),Zc(r,a));let o;o=this.type===e.SAMPLER_2D_SHADOW?Bc:zc;for(let e=0;e!==i;++e)n.setTexture2D(t[e]||o,a[e])}function Fl(e,t,n){let r=this.cache,i=t.length,a=Qc(n,i);Xc(r,a)||(e.uniform1iv(this.addr,a),Zc(r,a));for(let e=0;e!==i;++e)n.setTexture3D(t[e]||Hc,a[e])}function Il(e,t,n){let r=this.cache,i=t.length,a=Qc(n,i);Xc(r,a)||(e.uniform1iv(this.addr,a),Zc(r,a));for(let e=0;e!==i;++e)n.setTextureCube(t[e]||Uc,a[e])}function Ll(e,t,n){let r=this.cache,i=t.length,a=Qc(n,i);Xc(r,a)||(e.uniform1iv(this.addr,a),Zc(r,a));for(let e=0;e!==i;++e)n.setTexture2DArray(t[e]||Vc,a[e])}function Rl(e){switch(e){case 5126:return yl;case 35664:return bl;case 35665:return xl;case 35666:return Sl;case 35674:return Cl;case 35675:return wl;case 35676:return Tl;case 5124:case 35670:return El;case 35667:case 35671:return Dl;case 35668:case 35672:return Ol;case 35669:case 35673:return kl;case 5125:return Al;case 36294:return jl;case 36295:return Ml;case 36296:return Nl;case 35678:case 36198:case 36298:case 36306:case 35682:return Pl;case 35679:case 36299:case 36307:return Fl;case 35680:case 36300:case 36308:case 36293:return Il;case 36289:case 36303:case 36311:case 36292:return Ll}}var zl=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=vl(t.type)}},Bl=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=Rl(t.type)}},Vl=class{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){let r=this.seq;for(let i=0,a=r.length;i!==a;++i){let a=r[i];a.setValue(e,t[a.id],n)}}},Hl=/(\w+)(\])?(\[|\.)?/g;function Ul(e,t){e.seq.push(t),e.map[t.id]=t}function Wl(e,t,n){let r=e.name,i=r.length;for(Hl.lastIndex=0;;){let a=Hl.exec(r),o=Hl.lastIndex,s=a[1],c=a[2]===`]`,l=a[3];if(c&&(s|=0),l===void 0||l===`[`&&o+2===i){Ul(n,l===void 0?new zl(s,e,t):new Bl(s,e,t));break}{let e=n.map[s];e===void 0&&(e=new Vl(s),Ul(n,e)),n=e}}}var Gl=class{constructor(e,t){this.seq=[],this.map={};let n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let r=0;r<n;++r){let n=e.getActiveUniform(t,r);Wl(n,e.getUniformLocation(t,n.name),this)}let r=[],i=[];for(let t of this.seq)t.type===e.SAMPLER_2D_SHADOW||t.type===e.SAMPLER_CUBE_SHADOW||t.type===e.SAMPLER_2D_ARRAY_SHADOW?r.push(t):i.push(t);r.length>0&&(this.seq=r.concat(i))}setValue(e,t,n,r){let i=this.map[t];i!==void 0&&i.setValue(e,n,r)}setOptional(e,t,n){let r=t[n];r!==void 0&&this.setValue(e,n,r)}static upload(e,t,n,r){for(let i=0,a=t.length;i!==a;++i){let a=t[i],o=n[a.id];o.needsUpdate!==!1&&a.setValue(e,o.value,r)}}static seqWithValue(e,t){let n=[];for(let r=0,i=e.length;r!==i;++r){let i=e[r];i.id in t&&n.push(i)}return n}};function Kl(e,t,n){let r=e.createShader(t);return e.shaderSource(r,n),e.compileShader(r),r}var ql=37297,Jl=0;function Yl(e,t){let n=e.split(`
`),r=[],i=Math.max(t-6,0),a=Math.min(t+6,n.length);for(let e=i;e<a;e++){let i=e+1;r.push(`${i===t?`>`:` `} ${i}: ${n[e]}`)}return r.join(`
`)}var Xl=new Ge;function Zl(e){Xe._getMatrix(Xl,Xe.workingColorSpace,e);let t=`mat3( ${Xl.elements.map(e=>e.toFixed(4))} )`;switch(Xe.getTransfer(e)){case ne:return[t,`LinearTransferOETF`];case P:return[t,`sRGBTransferOETF`];default:return F(`WebGLProgram: Unsupported color space: `,e),[t,`LinearTransferOETF`]}}function Ql(e,t,n){let r=e.getShaderParameter(t,e.COMPILE_STATUS),i=(e.getShaderInfoLog(t)||``).trim();if(r&&i===``)return``;let a=/ERROR: 0:(\d+)/.exec(i);if(a){let r=parseInt(a[1]);return n.toUpperCase()+`

`+i+`

`+Yl(e.getShaderSource(t),r)}return i}function $l(e,t){let n=Zl(t);return[`vec4 ${e}( vec4 value ) {`,`	return ${n[1]}( vec4( value.rgb * ${n[0]}, value.a ) );`,`}`].join(`
`)}var eu={1:`Linear`,2:`Reinhard`,3:`Cineon`,4:`ACESFilmic`,6:`AgX`,7:`Neutral`,5:`Custom`};function tu(e,t){let n=eu[t];return n===void 0?(F(`WebGLProgram: Unsupported toneMapping:`,t),`vec3 `+e+`( vec3 color ) { return LinearToneMapping( color ); }`):`vec3 `+e+`( vec3 color ) { return `+n+`ToneMapping( color ); }`}var nu=new V;function ru(){return Xe.getLuminanceCoefficients(nu),[`float luminance( const in vec3 rgb ) {`,`	const vec3 weights = vec3( ${nu.x.toFixed(4)}, ${nu.y.toFixed(4)}, ${nu.z.toFixed(4)} );`,`	return dot( weights, rgb );`,`}`].join(`
`)}function iu(e){return[e.extensionClipCullDistance?`#extension GL_ANGLE_clip_cull_distance : require`:``,e.extensionMultiDraw?`#extension GL_ANGLE_multi_draw : require`:``].filter(su).join(`
`)}function au(e){let t=[];for(let n in e){let r=e[n];r!==!1&&t.push(`#define `+n+` `+r)}return t.join(`
`)}function ou(e,t){let n={},r=e.getProgramParameter(t,e.ACTIVE_ATTRIBUTES);for(let i=0;i<r;i++){let r=e.getActiveAttrib(t,i),a=r.name,o=1;r.type===e.FLOAT_MAT2&&(o=2),r.type===e.FLOAT_MAT3&&(o=3),r.type===e.FLOAT_MAT4&&(o=4),n[a]={type:r.type,location:e.getAttribLocation(t,a),locationSize:o}}return n}function su(e){return e!==``}function cu(e,t){let n=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return e.replace(/NUM_SUN_LIGHTS/g,t.numSunLights).replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,n).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_SUN_LIGHT_SHADOWS/g,t.numSunLightShadows).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function lu(e,t){return e.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}var uu=/^[ \t]*#include +<([\w\d./]+)>/gm;function du(e){return e.replace(uu,pu)}var fu=new Map;function pu(e,t){let n=Qs[t];if(n===void 0){let e=fu.get(t);if(e!==void 0)n=Qs[e],F(`WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.`,t,e);else throw Error(`THREE.WebGLProgram: Can not resolve #include <`+t+`>`)}return du(n)}var mu=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function hu(e){return e.replace(mu,gu)}function gu(e,t,n,r){let i=``;for(let e=parseInt(t);e<parseInt(n);e++)i+=r.replace(/\[\s*i\s*\]/g,`[ `+e+` ]`).replace(/UNROLLED_LOOP_INDEX/g,e);return i}function _u(e){let t=`precision ${e.precision} float;
	precision ${e.precision} int;
	precision ${e.precision} sampler2D;
	precision ${e.precision} samplerCube;
	precision ${e.precision} sampler3D;
	precision ${e.precision} sampler2DArray;
	precision ${e.precision} sampler2DShadow;
	precision ${e.precision} samplerCubeShadow;
	precision ${e.precision} sampler2DArrayShadow;
	precision ${e.precision} isampler2D;
	precision ${e.precision} isampler3D;
	precision ${e.precision} isamplerCube;
	precision ${e.precision} isampler2DArray;
	precision ${e.precision} usampler2D;
	precision ${e.precision} usampler3D;
	precision ${e.precision} usamplerCube;
	precision ${e.precision} usampler2DArray;
	`;return e.precision===`highp`?t+=`
#define HIGH_PRECISION`:e.precision===`mediump`?t+=`
#define MEDIUM_PRECISION`:e.precision===`lowp`&&(t+=`
#define LOW_PRECISION`),t}var vu={1:`SHADOWMAP_TYPE_PCF`,3:`SHADOWMAP_TYPE_VSM`};function yu(e){return vu[e.shadowMapType]||`SHADOWMAP_TYPE_BASIC`}var bu={301:`ENVMAP_TYPE_CUBE`,302:`ENVMAP_TYPE_CUBE`,306:`ENVMAP_TYPE_CUBE_UV`};function xu(e){return e.envMap===!1?`ENVMAP_TYPE_CUBE`:bu[e.envMapMode]||`ENVMAP_TYPE_CUBE`}var Su={302:`ENVMAP_MODE_REFRACTION`};function Cu(e){return e.envMap===!1?`ENVMAP_MODE_REFLECTION`:Su[e.envMapMode]||`ENVMAP_MODE_REFLECTION`}var wu={0:`ENVMAP_BLENDING_MULTIPLY`,1:`ENVMAP_BLENDING_MIX`,2:`ENVMAP_BLENDING_ADD`};function Tu(e){return e.envMap===!1?`ENVMAP_BLENDING_NONE`:wu[e.combine]||`ENVMAP_BLENDING_NONE`}function Eu(e){let t=e.envMapCubeUVHeight;if(t===null)return null;let n=Math.log2(t)-2,r=1/t;return{texelWidth:1/(3*Math.max(2**n,112)),texelHeight:r,maxMip:n}}function Du(e,t,n,r){let i=e.getContext(),a=n.defines,o=n.vertexShader,s=n.fragmentShader,c=yu(n),l=xu(n),u=Cu(n),d=Tu(n),f=Eu(n),p=iu(n),m=au(a),h=i.createProgram(),g,_,v=n.glslVersion?`#version `+n.glslVersion+`
`:``;n.isRawShaderMaterial?(g=[`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,m].filter(su).join(`
`),g.length>0&&(g+=`
`),_=[`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,m].filter(su).join(`
`),_.length>0&&(_+=`
`)):(g=[_u(n),`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,m,n.extensionClipCullDistance?`#define USE_CLIP_DISTANCE`:``,n.batching?`#define USE_BATCHING`:``,n.batchingColor?`#define USE_BATCHING_COLOR`:``,n.instancing?`#define USE_INSTANCING`:``,n.instancingColor?`#define USE_INSTANCING_COLOR`:``,n.instancingMorph?`#define USE_INSTANCING_MORPH`:``,n.useFog&&n.fog?`#define USE_FOG`:``,n.useFog&&n.fogExp2?`#define FOG_EXP2`:``,n.map?`#define USE_MAP`:``,n.envMap?`#define USE_ENVMAP`:``,n.envMap?`#define `+u:``,n.lightMap?`#define USE_LIGHTMAP`:``,n.aoMap?`#define USE_AOMAP`:``,n.bumpMap?`#define USE_BUMPMAP`:``,n.normalMap?`#define USE_NORMALMAP`:``,n.normalMapObjectSpace?`#define USE_NORMALMAP_OBJECTSPACE`:``,n.normalMapTangentSpace?`#define USE_NORMALMAP_TANGENTSPACE`:``,n.displacementMap?`#define USE_DISPLACEMENTMAP`:``,n.emissiveMap?`#define USE_EMISSIVEMAP`:``,n.anisotropy?`#define USE_ANISOTROPY`:``,n.anisotropyMap?`#define USE_ANISOTROPYMAP`:``,n.clearcoatMap?`#define USE_CLEARCOATMAP`:``,n.clearcoatRoughnessMap?`#define USE_CLEARCOAT_ROUGHNESSMAP`:``,n.clearcoatNormalMap?`#define USE_CLEARCOAT_NORMALMAP`:``,n.iridescenceMap?`#define USE_IRIDESCENCEMAP`:``,n.iridescenceThicknessMap?`#define USE_IRIDESCENCE_THICKNESSMAP`:``,n.specularMap?`#define USE_SPECULARMAP`:``,n.specularColorMap?`#define USE_SPECULAR_COLORMAP`:``,n.specularIntensityMap?`#define USE_SPECULAR_INTENSITYMAP`:``,n.roughnessMap?`#define USE_ROUGHNESSMAP`:``,n.metalnessMap?`#define USE_METALNESSMAP`:``,n.alphaMap?`#define USE_ALPHAMAP`:``,n.alphaHash?`#define USE_ALPHAHASH`:``,n.transmission?`#define USE_TRANSMISSION`:``,n.transmissionMap?`#define USE_TRANSMISSIONMAP`:``,n.thicknessMap?`#define USE_THICKNESSMAP`:``,n.sheenColorMap?`#define USE_SHEEN_COLORMAP`:``,n.sheenRoughnessMap?`#define USE_SHEEN_ROUGHNESSMAP`:``,n.mapUv?`#define MAP_UV `+n.mapUv:``,n.alphaMapUv?`#define ALPHAMAP_UV `+n.alphaMapUv:``,n.lightMapUv?`#define LIGHTMAP_UV `+n.lightMapUv:``,n.aoMapUv?`#define AOMAP_UV `+n.aoMapUv:``,n.emissiveMapUv?`#define EMISSIVEMAP_UV `+n.emissiveMapUv:``,n.bumpMapUv?`#define BUMPMAP_UV `+n.bumpMapUv:``,n.normalMapUv?`#define NORMALMAP_UV `+n.normalMapUv:``,n.displacementMapUv?`#define DISPLACEMENTMAP_UV `+n.displacementMapUv:``,n.metalnessMapUv?`#define METALNESSMAP_UV `+n.metalnessMapUv:``,n.roughnessMapUv?`#define ROUGHNESSMAP_UV `+n.roughnessMapUv:``,n.anisotropyMapUv?`#define ANISOTROPYMAP_UV `+n.anisotropyMapUv:``,n.clearcoatMapUv?`#define CLEARCOATMAP_UV `+n.clearcoatMapUv:``,n.clearcoatNormalMapUv?`#define CLEARCOAT_NORMALMAP_UV `+n.clearcoatNormalMapUv:``,n.clearcoatRoughnessMapUv?`#define CLEARCOAT_ROUGHNESSMAP_UV `+n.clearcoatRoughnessMapUv:``,n.iridescenceMapUv?`#define IRIDESCENCEMAP_UV `+n.iridescenceMapUv:``,n.iridescenceThicknessMapUv?`#define IRIDESCENCE_THICKNESSMAP_UV `+n.iridescenceThicknessMapUv:``,n.sheenColorMapUv?`#define SHEEN_COLORMAP_UV `+n.sheenColorMapUv:``,n.sheenRoughnessMapUv?`#define SHEEN_ROUGHNESSMAP_UV `+n.sheenRoughnessMapUv:``,n.specularMapUv?`#define SPECULARMAP_UV `+n.specularMapUv:``,n.specularColorMapUv?`#define SPECULAR_COLORMAP_UV `+n.specularColorMapUv:``,n.specularIntensityMapUv?`#define SPECULAR_INTENSITYMAP_UV `+n.specularIntensityMapUv:``,n.transmissionMapUv?`#define TRANSMISSIONMAP_UV `+n.transmissionMapUv:``,n.thicknessMapUv?`#define THICKNESSMAP_UV `+n.thicknessMapUv:``,n.vertexTangents&&n.flatShading===!1?`#define USE_TANGENT`:``,n.vertexNormals?`#define HAS_NORMAL`:``,n.vertexColors?`#define USE_COLOR`:``,n.vertexAlphas?`#define USE_COLOR_ALPHA`:``,n.vertexUv1s?`#define USE_UV1`:``,n.vertexUv2s?`#define USE_UV2`:``,n.vertexUv3s?`#define USE_UV3`:``,n.pointsUvs?`#define USE_POINTS_UV`:``,n.flatShading?`#define FLAT_SHADED`:``,n.skinning?`#define USE_SKINNING`:``,n.morphTargets?`#define USE_MORPHTARGETS`:``,n.morphNormals&&n.flatShading===!1?`#define USE_MORPHNORMALS`:``,n.morphColors?`#define USE_MORPHCOLORS`:``,n.morphTargetsCount>0?`#define MORPHTARGETS_TEXTURE_STRIDE `+n.morphTextureStride:``,n.morphTargetsCount>0?`#define MORPHTARGETS_COUNT `+n.morphTargetsCount:``,n.doubleSided?`#define DOUBLE_SIDED`:``,n.flipSided?`#define FLIP_SIDED`:``,n.shadowMapEnabled?`#define USE_SHADOWMAP`:``,n.shadowMapEnabled?`#define `+c:``,n.sizeAttenuation?`#define USE_SIZEATTENUATION`:``,n.numLightProbes>0?`#define USE_LIGHT_PROBES`:``,n.logarithmicDepthBuffer?`#define USE_LOGARITHMIC_DEPTH_BUFFER`:``,n.reversedDepthBuffer?`#define USE_REVERSED_DEPTH_BUFFER`:``,`uniform mat4 modelMatrix;`,`uniform mat4 modelViewMatrix;`,`uniform mat4 projectionMatrix;`,`uniform mat4 viewMatrix;`,`uniform mat3 normalMatrix;`,`uniform vec3 cameraPosition;`,`uniform bool isOrthographic;`,`#ifdef USE_INSTANCING`,`	attribute mat4 instanceMatrix;`,`#endif`,`#ifdef USE_INSTANCING_COLOR`,`	attribute vec3 instanceColor;`,`#endif`,`#ifdef USE_INSTANCING_MORPH`,`	uniform sampler2D morphTexture;`,`#endif`,`attribute vec3 position;`,`attribute vec3 normal;`,`attribute vec2 uv;`,`#ifdef USE_UV1`,`	attribute vec2 uv1;`,`#endif`,`#ifdef USE_UV2`,`	attribute vec2 uv2;`,`#endif`,`#ifdef USE_UV3`,`	attribute vec2 uv3;`,`#endif`,`#ifdef USE_TANGENT`,`	attribute vec4 tangent;`,`#endif`,`#if defined( USE_COLOR_ALPHA )`,`	attribute vec4 color;`,`#elif defined( USE_COLOR )`,`	attribute vec3 color;`,`#endif`,`#ifdef USE_SKINNING`,`	attribute vec4 skinIndex;`,`	attribute vec4 skinWeight;`,`#endif`,`
`].filter(su).join(`
`),_=[_u(n),`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,m,n.useFog&&n.fog?`#define USE_FOG`:``,n.useFog&&n.fogExp2?`#define FOG_EXP2`:``,n.alphaToCoverage?`#define ALPHA_TO_COVERAGE`:``,n.map?`#define USE_MAP`:``,n.matcap?`#define USE_MATCAP`:``,n.envMap?`#define USE_ENVMAP`:``,n.envMap?`#define `+l:``,n.envMap?`#define `+u:``,n.envMap?`#define `+d:``,f?`#define CUBEUV_TEXEL_WIDTH `+f.texelWidth:``,f?`#define CUBEUV_TEXEL_HEIGHT `+f.texelHeight:``,f?`#define CUBEUV_MAX_MIP `+f.maxMip+`.0`:``,n.lightMap?`#define USE_LIGHTMAP`:``,n.aoMap?`#define USE_AOMAP`:``,n.bumpMap?`#define USE_BUMPMAP`:``,n.normalMap?`#define USE_NORMALMAP`:``,n.normalMapObjectSpace?`#define USE_NORMALMAP_OBJECTSPACE`:``,n.normalMapTangentSpace?`#define USE_NORMALMAP_TANGENTSPACE`:``,n.packedNormalMap?`#define USE_PACKED_NORMALMAP`:``,n.emissiveMap?`#define USE_EMISSIVEMAP`:``,n.anisotropy?`#define USE_ANISOTROPY`:``,n.anisotropyMap?`#define USE_ANISOTROPYMAP`:``,n.clearcoat?`#define USE_CLEARCOAT`:``,n.clearcoatMap?`#define USE_CLEARCOATMAP`:``,n.clearcoatRoughnessMap?`#define USE_CLEARCOAT_ROUGHNESSMAP`:``,n.clearcoatNormalMap?`#define USE_CLEARCOAT_NORMALMAP`:``,n.dispersion?`#define USE_DISPERSION`:``,n.retroreflection?`#define USE_RETROREFLECTION`:``,n.iridescence?`#define USE_IRIDESCENCE`:``,n.iridescenceMap?`#define USE_IRIDESCENCEMAP`:``,n.iridescenceThicknessMap?`#define USE_IRIDESCENCE_THICKNESSMAP`:``,n.specularMap?`#define USE_SPECULARMAP`:``,n.specularColorMap?`#define USE_SPECULAR_COLORMAP`:``,n.specularIntensityMap?`#define USE_SPECULAR_INTENSITYMAP`:``,n.roughnessMap?`#define USE_ROUGHNESSMAP`:``,n.metalnessMap?`#define USE_METALNESSMAP`:``,n.alphaMap?`#define USE_ALPHAMAP`:``,n.alphaTest?`#define USE_ALPHATEST`:``,n.alphaHash?`#define USE_ALPHAHASH`:``,n.sheen?`#define USE_SHEEN`:``,n.sheenColorMap?`#define USE_SHEEN_COLORMAP`:``,n.sheenRoughnessMap?`#define USE_SHEEN_ROUGHNESSMAP`:``,n.transmission?`#define USE_TRANSMISSION`:``,n.transmissionMap?`#define USE_TRANSMISSIONMAP`:``,n.thicknessMap?`#define USE_THICKNESSMAP`:``,n.vertexTangents&&n.flatShading===!1?`#define USE_TANGENT`:``,n.vertexColors||n.instancingColor?`#define USE_COLOR`:``,n.vertexAlphas||n.batchingColor?`#define USE_COLOR_ALPHA`:``,n.vertexUv1s?`#define USE_UV1`:``,n.vertexUv2s?`#define USE_UV2`:``,n.vertexUv3s?`#define USE_UV3`:``,n.pointsUvs?`#define USE_POINTS_UV`:``,n.gradientMap?`#define USE_GRADIENTMAP`:``,n.flatShading?`#define FLAT_SHADED`:``,n.doubleSided?`#define DOUBLE_SIDED`:``,n.flipSided?`#define FLIP_SIDED`:``,n.shadowMapEnabled?`#define USE_SHADOWMAP`:``,n.shadowMapEnabled?`#define `+c:``,n.premultipliedAlpha?`#define PREMULTIPLIED_ALPHA`:``,n.numLightProbes>0?`#define USE_LIGHT_PROBES`:``,n.numLightProbeGrids>0?`#define USE_LIGHT_PROBES_GRID`:``,n.decodeVideoTexture?`#define DECODE_VIDEO_TEXTURE`:``,n.decodeVideoTextureEmissive?`#define DECODE_VIDEO_TEXTURE_EMISSIVE`:``,n.logarithmicDepthBuffer?`#define USE_LOGARITHMIC_DEPTH_BUFFER`:``,n.reversedDepthBuffer?`#define USE_REVERSED_DEPTH_BUFFER`:``,`uniform mat4 viewMatrix;`,`uniform vec3 cameraPosition;`,`uniform bool isOrthographic;`,n.toneMapping===0?``:`#define TONE_MAPPING`,n.toneMapping===0?``:Qs.tonemapping_pars_fragment,n.toneMapping===0?``:tu(`toneMapping`,n.toneMapping),n.dithering?`#define DITHERING`:``,n.opaque?`#define OPAQUE`:``,Qs.colorspace_pars_fragment,$l(`linearToOutputTexel`,n.outputColorSpace),ru(),n.useDepthPacking?`#define DEPTH_PACKING `+n.depthPacking:``,`
`].filter(su).join(`
`)),o=du(o),o=cu(o,n),o=lu(o,n),s=du(s),s=cu(s,n),s=lu(s,n),o=hu(o),s=hu(s),n.isRawShaderMaterial!==!0&&(v=`#version 300 es
`,g=[p,`#define attribute in`,`#define varying out`,`#define texture2D texture`].join(`
`)+`
`+g,_=[`#define varying in`,n.glslVersion===`300 es`?``:`layout(location = 0) out highp vec4 pc_fragColor;`,n.glslVersion===`300 es`?``:`#define gl_FragColor pc_fragColor`,`#define gl_FragDepthEXT gl_FragDepth`,`#define texture2D texture`,`#define textureCube texture`,`#define texture2DProj textureProj`,`#define texture2DLodEXT textureLod`,`#define texture2DProjLodEXT textureProjLod`,`#define textureCubeLodEXT textureLod`,`#define texture2DGradEXT textureGrad`,`#define texture2DProjGradEXT textureProjGrad`,`#define textureCubeGradEXT textureGrad`].join(`
`)+`
`+_);let y=v+g+o,b=v+_+s,x=Kl(i,i.VERTEX_SHADER,y),S=Kl(i,i.FRAGMENT_SHADER,b);i.attachShader(h,x),i.attachShader(h,S),n.index0AttributeName===void 0?n.hasPositionAttribute===!0&&i.bindAttribLocation(h,0,`position`):i.bindAttribLocation(h,0,n.index0AttributeName),i.linkProgram(h);function C(t){if(e.debug.checkShaderErrors){let n=i.getProgramInfoLog(h)||``,r=i.getShaderInfoLog(x)||``,a=i.getShaderInfoLog(S)||``,o=n.trim(),s=r.trim(),c=a.trim(),l=!0,u=!0;if(i.getProgramParameter(h,i.LINK_STATUS)===!1){if(l=!1,typeof e.debug.onShaderError==`function`)e.debug.onShaderError(i,h,x,S);else{let e=Ql(i,x,`vertex`),n=Ql(i,S,`fragment`);me(`WebGLProgram: Shader Error `+i.getError()+` - VALIDATE_STATUS `+i.getProgramParameter(h,i.VALIDATE_STATUS)+`

Material Name: `+t.name+`
Material Type: `+t.type+`

Program Info Log: `+o+`
`+e+`
`+n)}}else o===``?(s===``||c===``)&&(u=!1):F(`WebGLProgram: Program Info Log:`,o);u&&(t.diagnostics={runnable:l,programLog:o,vertexShader:{log:s,prefix:g},fragmentShader:{log:c,prefix:_}})}i.deleteShader(x),i.deleteShader(S),w=new Gl(i,h),T=ou(i,h)}let w;this.getUniforms=function(){return w===void 0&&C(this),w};let T;this.getAttributes=function(){return T===void 0&&C(this),T};let E=n.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return E===!1&&(E=i.getProgramParameter(h,ql)),E},this.destroy=function(){r.releaseStatesOfProgram(this),i.deleteProgram(h),this.program=void 0},this.type=n.shaderType,this.name=n.shaderName,this.id=Jl++,this.cacheKey=t,this.usedTimes=1,this.program=h,this.vertexShader=x,this.fragmentShader=S,this}var Ou=0,ku=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e,t,n){let r=this._getShaderCacheForMaterial(e);return r.has(t)===!1&&(r.add(t),t.usedTimes++),r.has(n)===!1&&(r.add(n),n.usedTimes++),this}remove(e){let t=this.materialCache.get(e);for(let e of t)e.usedTimes--,e.usedTimes===0&&this.shaderCache.delete(e.code);return this.materialCache.delete(e),this}getVertexShaderStage(e){return this._getShaderStage(e.vertexShader)}getFragmentShaderStage(e){return this._getShaderStage(e.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){let t=this.materialCache,n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){let t=this.shaderCache,n=t.get(e);return n===void 0&&(n=new Au(e),t.set(e,n)),n}},Au=class{constructor(e){this.id=Ou++,this.code=e,this.usedTimes=0}};function ju(e){return e===1030||e===37490||e===36285}function Mu(e,t,n,r,i,a){let o=new Ct,s=new ku,c=new Set,l=[],u=new Map,d=r.logarithmicDepthBuffer,f=r.precision,p={MeshDepthMaterial:`depth`,MeshDistanceMaterial:`distance`,MeshNormalMaterial:`normal`,MeshBasicMaterial:`basic`,MeshLambertMaterial:`lambert`,MeshPhongMaterial:`phong`,MeshToonMaterial:`toon`,MeshStandardMaterial:`physical`,MeshPhysicalMaterial:`physical`,MeshMatcapMaterial:`matcap`,LineBasicMaterial:`basic`,LineDashedMaterial:`dashed`,PointsMaterial:`points`,ShadowMaterial:`shadow`,SpriteMaterial:`sprite`};function m(e){return c.add(e),e===0?`uv`:`uv${e}`}function h(i,o,l,u,h,g){let _=u.fog,v=h.geometry,y=i.isMeshStandardMaterial||i.isMeshLambertMaterial||i.isMeshPhongMaterial?u.environment:null,b=i.isMeshStandardMaterial||i.isMeshLambertMaterial&&!i.envMap||i.isMeshPhongMaterial&&!i.envMap,x=t.get(i.envMap||y,b),S=x&&x.mapping===306?x.image.height:null,C=p[i.type];i.precision!==null&&(f=r.getMaxPrecision(i.precision),f!==i.precision&&F(`WebGLProgram.getParameters:`,i.precision,`not supported, using`,f,`instead.`));let w=v.morphAttributes.position||v.morphAttributes.normal||v.morphAttributes.color,T=w===void 0?0:w.length,E=0;v.morphAttributes.position!==void 0&&(E=1),v.morphAttributes.normal!==void 0&&(E=2),v.morphAttributes.color!==void 0&&(E=3);let D,O,k,A;if(C){let e=$s[C];D=e.vertexShader,O=e.fragmentShader}else{D=i.vertexShader,O=i.fragmentShader;let e=s.getVertexShaderStage(i),t=s.getFragmentShaderStage(i);s.update(i,e,t),k=e.id,A=t.id}let j=e.getRenderTarget(),M=e.state.buffers.depth.getReversed(),ee=h.isInstancedMesh===!0,N=h.isBatchedMesh===!0,te=!!i.map,ne=!!i.matcap,P=!!x,re=!!i.aoMap,ie=!!i.lightMap,ae=!!i.bumpMap&&i.wireframe===!1,oe=!!i.normalMap,se=!!i.displacementMap,ce=!!i.emissiveMap,le=!!i.metalnessMap,ue=!!i.roughnessMap,de=i.anisotropy>0,fe=i.clearcoat>0,pe=i.dispersion>0,me=i.retroreflectivity>0,he=i.iridescence>0,ge=i.sheen>0,_e=i.transmission>0,ve=de&&!!i.anisotropyMap,ye=fe&&!!i.clearcoatMap,be=fe&&!!i.clearcoatNormalMap,xe=fe&&!!i.clearcoatRoughnessMap,Se=he&&!!i.iridescenceMap,Ce=he&&!!i.iridescenceThicknessMap,I=ge&&!!i.sheenColorMap,we=ge&&!!i.sheenRoughnessMap,Te=!!i.specularMap,Ee=!!i.specularColorMap,De=!!i.specularIntensityMap,Oe=_e&&!!i.transmissionMap,ke=_e&&!!i.thicknessMap,Ae=!!i.gradientMap,je=!!i.alphaMap,Me=i.alphaTest>0,Ne=!!i.alphaHash,Pe=!!i.extensions,Fe=0;i.toneMapped&&(j===null||j.isXRRenderTarget===!0)&&(Fe=e.toneMapping);let Ie={shaderID:C,shaderType:i.type,shaderName:i.name,vertexShader:D,fragmentShader:O,defines:i.defines,customVertexShaderID:k,customFragmentShaderID:A,isRawShaderMaterial:i.isRawShaderMaterial===!0,glslVersion:i.glslVersion,precision:f,batching:N,batchingColor:N&&h._colorsTexture!==null,instancing:ee,instancingColor:ee&&h.instanceColor!==null,instancingMorph:ee&&h.morphTexture!==null,outputColorSpace:j===null?e.outputColorSpace:j.isXRRenderTarget===!0?j.texture.colorSpace:Xe.workingColorSpace,alphaToCoverage:!!i.alphaToCoverage,map:te,matcap:ne,envMap:P,envMapMode:P&&x.mapping,envMapCubeUVHeight:S,aoMap:re,lightMap:ie,bumpMap:ae,normalMap:oe,displacementMap:se,emissiveMap:ce,normalMapObjectSpace:oe&&i.normalMapType===1,normalMapTangentSpace:oe&&i.normalMapType===0,packedNormalMap:oe&&i.normalMapType===0&&ju(i.normalMap.format),metalnessMap:le,roughnessMap:ue,anisotropy:de,anisotropyMap:ve,clearcoat:fe,clearcoatMap:ye,clearcoatNormalMap:be,clearcoatRoughnessMap:xe,dispersion:pe,retroreflection:me,iridescence:he,iridescenceMap:Se,iridescenceThicknessMap:Ce,sheen:ge,sheenColorMap:I,sheenRoughnessMap:we,specularMap:Te,specularColorMap:Ee,specularIntensityMap:De,transmission:_e,transmissionMap:Oe,thicknessMap:ke,gradientMap:Ae,opaque:i.transparent===!1&&i.blending===1&&i.alphaToCoverage===!1,alphaMap:je,alphaTest:Me,alphaHash:Ne,combine:i.combine,mapUv:te&&m(i.map.channel),aoMapUv:re&&m(i.aoMap.channel),lightMapUv:ie&&m(i.lightMap.channel),bumpMapUv:ae&&m(i.bumpMap.channel),normalMapUv:oe&&m(i.normalMap.channel),displacementMapUv:se&&m(i.displacementMap.channel),emissiveMapUv:ce&&m(i.emissiveMap.channel),metalnessMapUv:le&&m(i.metalnessMap.channel),roughnessMapUv:ue&&m(i.roughnessMap.channel),anisotropyMapUv:ve&&m(i.anisotropyMap.channel),clearcoatMapUv:ye&&m(i.clearcoatMap.channel),clearcoatNormalMapUv:be&&m(i.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:xe&&m(i.clearcoatRoughnessMap.channel),iridescenceMapUv:Se&&m(i.iridescenceMap.channel),iridescenceThicknessMapUv:Ce&&m(i.iridescenceThicknessMap.channel),sheenColorMapUv:I&&m(i.sheenColorMap.channel),sheenRoughnessMapUv:we&&m(i.sheenRoughnessMap.channel),specularMapUv:Te&&m(i.specularMap.channel),specularColorMapUv:Ee&&m(i.specularColorMap.channel),specularIntensityMapUv:De&&m(i.specularIntensityMap.channel),transmissionMapUv:Oe&&m(i.transmissionMap.channel),thicknessMapUv:ke&&m(i.thicknessMap.channel),alphaMapUv:je&&m(i.alphaMap.channel),vertexTangents:!!v.attributes.tangent&&(oe||de),vertexNormals:!!v.attributes.normal,vertexColors:i.vertexColors,vertexAlphas:i.vertexColors===!0&&!!v.attributes.color&&v.attributes.color.itemSize===4,pointsUvs:h.isPoints===!0&&!!v.attributes.uv&&(te||je),fog:!!_,useFog:i.fog===!0,fogExp2:!!_&&_.isFogExp2,flatShading:i.wireframe===!1&&(i.flatShading===!0||v.attributes.normal===void 0&&oe===!1&&(i.isMeshLambertMaterial||i.isMeshPhongMaterial||i.isMeshStandardMaterial||i.isMeshPhysicalMaterial)),sizeAttenuation:i.sizeAttenuation===!0,logarithmicDepthBuffer:d,reversedDepthBuffer:M,skinning:h.isSkinnedMesh===!0,hasPositionAttribute:v.attributes.position!==void 0,morphTargets:v.morphAttributes.position!==void 0,morphNormals:v.morphAttributes.normal!==void 0,morphColors:v.morphAttributes.color!==void 0,morphTargetsCount:T,morphTextureStride:E,numSunLights:o.sun.length,numDirLights:o.directional.length,numPointLights:o.point.length,numSpotLights:o.spot.length,numSpotLightMaps:o.spotLightMap.length,numRectAreaLights:o.rectArea.length,numHemiLights:o.hemi.length,numSunLightShadows:o.sunShadowMap.length,numDirLightShadows:o.directionalShadowMap.length,numPointLightShadows:o.pointShadowMap.length,numSpotLightShadows:o.spotShadowMap.length,numSpotLightShadowsWithMaps:o.numSpotLightShadowsWithMaps,numLightProbes:o.numLightProbes,numLightProbeGrids:g.length,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:i.dithering,shadowMapEnabled:e.shadowMap.enabled&&l.length>0,shadowMapType:e.shadowMap.type,toneMapping:Fe,decodeVideoTexture:te&&i.map.isVideoTexture===!0&&Xe.getTransfer(i.map.colorSpace)===`srgb`,decodeVideoTextureEmissive:ce&&i.emissiveMap.isVideoTexture===!0&&Xe.getTransfer(i.emissiveMap.colorSpace)===`srgb`,premultipliedAlpha:i.premultipliedAlpha,doubleSided:i.side===2,flipSided:i.side===1,useDepthPacking:i.depthPacking>=0,depthPacking:i.depthPacking||0,index0AttributeName:i.index0AttributeName,extensionClipCullDistance:Pe&&i.extensions.clipCullDistance===!0&&n.has(`WEBGL_clip_cull_distance`),extensionMultiDraw:(Pe&&i.extensions.multiDraw===!0||N)&&n.has(`WEBGL_multi_draw`),rendererExtensionParallelShaderCompile:n.has(`KHR_parallel_shader_compile`),customProgramCacheKey:i.customProgramCacheKey()};return Ie.vertexUv1s=c.has(1),Ie.vertexUv2s=c.has(2),Ie.vertexUv3s=c.has(3),c.clear(),Ie}function g(t){let n=[];if(t.shaderID?n.push(t.shaderID):(n.push(t.customVertexShaderID),n.push(t.customFragmentShaderID)),t.defines!==void 0)for(let e in t.defines)n.push(e),n.push(t.defines[e]);return t.isRawShaderMaterial===!1&&(_(n,t),v(n,t),n.push(e.outputColorSpace)),n.push(t.customProgramCacheKey),n.join()}function _(e,t){e.push(t.precision),e.push(t.outputColorSpace),e.push(t.envMapMode),e.push(t.envMapCubeUVHeight),e.push(t.mapUv),e.push(t.alphaMapUv),e.push(t.lightMapUv),e.push(t.aoMapUv),e.push(t.bumpMapUv),e.push(t.normalMapUv),e.push(t.displacementMapUv),e.push(t.emissiveMapUv),e.push(t.metalnessMapUv),e.push(t.roughnessMapUv),e.push(t.anisotropyMapUv),e.push(t.clearcoatMapUv),e.push(t.clearcoatNormalMapUv),e.push(t.clearcoatRoughnessMapUv),e.push(t.iridescenceMapUv),e.push(t.iridescenceThicknessMapUv),e.push(t.sheenColorMapUv),e.push(t.sheenRoughnessMapUv),e.push(t.specularMapUv),e.push(t.specularColorMapUv),e.push(t.specularIntensityMapUv),e.push(t.transmissionMapUv),e.push(t.thicknessMapUv),e.push(t.combine),e.push(t.fogExp2),e.push(t.sizeAttenuation),e.push(t.morphTargetsCount),e.push(t.morphAttributeCount),e.push(t.numSunLights),e.push(t.numDirLights),e.push(t.numPointLights),e.push(t.numSpotLights),e.push(t.numSpotLightMaps),e.push(t.numHemiLights),e.push(t.numRectAreaLights),e.push(t.numSunLightShadows),e.push(t.numDirLightShadows),e.push(t.numPointLightShadows),e.push(t.numSpotLightShadows),e.push(t.numSpotLightShadowsWithMaps),e.push(t.numLightProbes),e.push(t.shadowMapType),e.push(t.toneMapping),e.push(t.numClippingPlanes),e.push(t.numClipIntersection),e.push(t.depthPacking)}function v(e,t){o.disableAll(),t.instancing&&o.enable(0),t.instancingColor&&o.enable(1),t.instancingMorph&&o.enable(2),t.matcap&&o.enable(3),t.envMap&&o.enable(4),t.normalMapObjectSpace&&o.enable(5),t.normalMapTangentSpace&&o.enable(6),t.clearcoat&&o.enable(7),t.iridescence&&o.enable(8),t.alphaTest&&o.enable(9),t.vertexColors&&o.enable(10),t.vertexAlphas&&o.enable(11),t.vertexUv1s&&o.enable(12),t.vertexUv2s&&o.enable(13),t.vertexUv3s&&o.enable(14),t.vertexTangents&&o.enable(15),t.anisotropy&&o.enable(16),t.alphaHash&&o.enable(17),t.batching&&o.enable(18),t.dispersion&&o.enable(19),t.retroreflection&&o.enable(24),t.batchingColor&&o.enable(20),t.gradientMap&&o.enable(21),t.packedNormalMap&&o.enable(22),t.vertexNormals&&o.enable(23),e.push(o.mask),o.disableAll(),t.fog&&o.enable(0),t.useFog&&o.enable(1),t.flatShading&&o.enable(2),t.logarithmicDepthBuffer&&o.enable(3),t.reversedDepthBuffer&&o.enable(4),t.skinning&&o.enable(5),t.morphTargets&&o.enable(6),t.morphNormals&&o.enable(7),t.morphColors&&o.enable(8),t.premultipliedAlpha&&o.enable(9),t.shadowMapEnabled&&o.enable(10),t.doubleSided&&o.enable(11),t.flipSided&&o.enable(12),t.useDepthPacking&&o.enable(13),t.dithering&&o.enable(14),t.transmission&&o.enable(15),t.sheen&&o.enable(16),t.opaque&&o.enable(17),t.pointsUvs&&o.enable(18),t.decodeVideoTexture&&o.enable(19),t.decodeVideoTextureEmissive&&o.enable(20),t.alphaToCoverage&&o.enable(21),t.numLightProbeGrids>0&&o.enable(22),t.hasPositionAttribute&&o.enable(23),e.push(o.mask)}function y(e){let t=p[e.type],n;if(t){let e=$s[t];n=ro.clone(e.uniforms)}else n=e.uniforms;return n}function b(t,n){let r=u.get(n);return r===void 0?(r=new Du(e,n,t,i),l.push(r),u.set(n,r)):++r.usedTimes,r}function x(e){if(--e.usedTimes===0){let t=l.indexOf(e);l[t]=l[l.length-1],l.pop(),u.delete(e.cacheKey),e.destroy()}}function S(e){s.remove(e)}function C(){s.dispose()}return{getParameters:h,getProgramCacheKey:g,getUniforms:y,acquireProgram:b,releaseProgram:x,releaseShaderCache:S,programs:l,dispose:C}}function Nu(){let e=new WeakMap;function t(t){return e.has(t)}function n(t){let n=e.get(t);return n===void 0&&(n={},e.set(t,n)),n}function r(t){e.delete(t)}function i(t,n,r){e.get(t)[n]=r}function a(){e=new WeakMap}return{has:t,get:n,remove:r,update:i,dispose:a}}function Pu(e,t){return e.groupOrder===t.groupOrder?e.renderOrder===t.renderOrder?e.material.id===t.material.id?e.materialVariant===t.materialVariant?e.z===t.z?e.id-t.id:e.z-t.z:e.materialVariant-t.materialVariant:e.material.id-t.material.id:e.renderOrder-t.renderOrder:e.groupOrder-t.groupOrder}function Fu(e,t){return e.groupOrder===t.groupOrder?e.renderOrder===t.renderOrder?e.z===t.z?e.id-t.id:t.z-e.z:e.renderOrder-t.renderOrder:e.groupOrder-t.groupOrder}function Iu(){let e=[],t=0,n=[],r=[],i=[];function a(){t=0,n.length=0,r.length=0,i.length=0}function o(e){let t=0;return e.isInstancedMesh&&(t+=2),e.isSkinnedMesh&&(t+=1),t}function s(n,r,i,a,s,c){let l=e[t];return l===void 0?(l={id:n.id,object:n,geometry:r,material:i,materialVariant:o(n),groupOrder:a,renderOrder:n.renderOrder,z:s,group:c},e[t]=l):(l.id=n.id,l.object=n,l.geometry=r,l.material=i,l.materialVariant=o(n),l.groupOrder=a,l.renderOrder=n.renderOrder,l.z=s,l.group=c),t++,l}function c(e,t,a,o,c,l,u){u.reversedDepth===!0&&(c=-c);let d=s(e,t,a,o,c,l);a.transmission>0?r.push(d):a.transparent===!0?i.push(d):n.push(d)}function l(e,t,a,o,c,l){let u=s(e,t,a,o,c,l);a.transmission>0?r.unshift(u):a.transparent===!0?i.unshift(u):n.unshift(u)}function u(e,t){n.length>1&&n.sort(e||Pu),r.length>1&&r.sort(t||Fu),i.length>1&&i.sort(t||Fu)}function d(){for(let n=t,r=e.length;n<r;n++){let t=e[n];if(t.id===null)break;t.id=null,t.object=null,t.geometry=null,t.material=null,t.group=null}}return{opaque:n,transmissive:r,transparent:i,init:a,push:c,unshift:l,finish:d,sort:u}}function Lu(){let e=new WeakMap;function t(t,n){let r=e.get(t),i;return r===void 0?(i=new Iu,e.set(t,[i])):n>=r.length?(i=new Iu,r.push(i)):i=r[n],i}function n(){e=new WeakMap}return{get:t,dispose:n}}function Ru(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case`SunLight`:case`DirectionalLight`:n={direction:new V,color:new U};break;case`SpotLight`:n={position:new V,direction:new V,color:new U,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case`PointLight`:n={position:new V,color:new U,distance:0,decay:0};break;case`HemisphereLight`:n={direction:new V,skyColor:new U,groundColor:new U};break;case`RectAreaLight`:n={color:new U,position:new V,halfWidth:new V,halfHeight:new V}}return e[t.id]=n,n}}}function zu(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case`SunLight`:case`DirectionalLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new z};break;case`SpotLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new z};break;case`PointLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new z,shadowCameraNear:1,shadowCameraFar:1e3}}return e[t.id]=n,n}}}var Bu=0;function Vu(e,t){return(t.castShadow?2:0)-(e.castShadow?2:0)+ +!!t.map-!!e.map}function Hu(e){let t=new Ru,n=zu(),r={version:0,hash:{sunLength:-1,directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numSunShadows:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],sun:[],sunShadow:[],sunShadowMap:[],sunShadowMatrix:[],sunShadowCascade:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let e=0;e<9;e++)r.probe.push(new V);let i=new V,a=new ft,o=new ft;function s(i){let a=0,o=0,s=0;for(let e=0;e<9;e++)r.probe[e].set(0,0,0);let c=0,l=0,u=0,d=0,f=0,p=0,m=0,h=0,g=0,_=0,v=0,y=0,b=0,x=0;i.sort(Vu);for(let e=0,S=i.length;e<S;e++){let S=i[e],C=S.color,w=S.intensity,T=S.distance,E=null;if(S.shadow&&S.shadow.map&&(E=S.shadow.map.texture.format===1030?S.shadow.map.texture:S.shadow.map.depthTexture||S.shadow.map.texture),S.isAmbientLight)a+=C.r*w,o+=C.g*w,s+=C.b*w;else if(S.isLightProbe){for(let e=0;e<9;e++)r.probe[e].addScaledVector(S.sh.coefficients[e],w);x++}else if(S.isSunLight){let e=t.get(S);if(e.color.copy(S.color).multiplyScalar(S.intensity),S.castShadow){let e=S.shadow,t=n.get(S);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize.copy(e.mapSize).multiply(e.getFrameExtents()),r.sunShadow[l]=t,r.sunShadowMap[l]=E;let i=e.getViewportCount();for(let t=0;t<i;t++)r.sunShadowMatrix[u+t]=e.getMatrix(t),r.sunShadowCascade[u+t]=e._cascadeData[t];u+=i,l++}r.sun[c]=e,c++}else if(S.isDirectionalLight){let e=t.get(S);if(e.color.copy(S.color).multiplyScalar(S.intensity),S.castShadow){let e=S.shadow,t=n.get(S);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize=e.mapSize,r.directionalShadow[d]=t,r.directionalShadowMap[d]=E,r.directionalShadowMatrix[d]=S.shadow.matrix,g++}r.directional[d]=e,d++}else if(S.isSpotLight){let e=t.get(S);e.position.setFromMatrixPosition(S.matrixWorld),e.color.copy(C).multiplyScalar(w),e.distance=T,e.coneCos=Math.cos(S.angle),e.penumbraCos=Math.cos(S.angle*(1-S.penumbra)),e.decay=S.decay,r.spot[p]=e;let i=S.shadow;if(S.map&&(r.spotLightMap[y]=S.map,y++,i.updateMatrices(S),S.castShadow&&b++),r.spotLightMatrix[p]=i.matrix,S.castShadow){let e=n.get(S);e.shadowIntensity=i.intensity,e.shadowBias=i.bias,e.shadowNormalBias=i.normalBias,e.shadowRadius=i.radius,e.shadowMapSize=i.mapSize,r.spotShadow[p]=e,r.spotShadowMap[p]=E,v++}p++}else if(S.isRectAreaLight){let e=t.get(S);e.color.copy(C).multiplyScalar(w),e.halfWidth.set(S.width*.5,0,0),e.halfHeight.set(0,S.height*.5,0),r.rectArea[m]=e,m++}else if(S.isPointLight){let e=t.get(S);if(e.color.copy(S.color).multiplyScalar(S.intensity),e.distance=S.distance,e.decay=S.decay,S.castShadow){let e=S.shadow,t=n.get(S);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize=e.mapSize,t.shadowCameraNear=e.camera.near,t.shadowCameraFar=e.camera.far,r.pointShadow[f]=t,r.pointShadowMap[f]=E,r.pointShadowMatrix[f]=S.shadow.matrix,_++}r.point[f]=e,f++}else if(S.isHemisphereLight){let e=t.get(S);e.skyColor.copy(S.color).multiplyScalar(w),e.groundColor.copy(S.groundColor).multiplyScalar(w),r.hemi[h]=e,h++}}m>0&&(e.has(`OES_texture_float_linear`)===!0?(r.rectAreaLTC1=K.LTC_FLOAT_1,r.rectAreaLTC2=K.LTC_FLOAT_2):(r.rectAreaLTC1=K.LTC_HALF_1,r.rectAreaLTC2=K.LTC_HALF_2)),r.ambient[0]=a,r.ambient[1]=o,r.ambient[2]=s;let S=r.hash;(S.sunLength!==c||S.directionalLength!==d||S.pointLength!==f||S.spotLength!==p||S.rectAreaLength!==m||S.hemiLength!==h||S.numSunShadows!==l||S.numDirectionalShadows!==g||S.numPointShadows!==_||S.numSpotShadows!==v||S.numSpotMaps!==y||S.numLightProbes!==x)&&(r.sun.length=c,r.directional.length=d,r.spot.length=p,r.rectArea.length=m,r.point.length=f,r.hemi.length=h,r.sunShadow.length=l,r.sunShadowMap.length=l,r.sunShadowMatrix.length=u,r.sunShadowCascade.length=u,r.directionalShadow.length=g,r.directionalShadowMap.length=g,r.directionalShadowMatrix.length=g,r.pointShadow.length=_,r.pointShadowMap.length=_,r.pointShadowMatrix.length=_,r.spotShadow.length=v,r.spotShadowMap.length=v,r.spotLightMatrix.length=v+y-b,r.spotLightMap.length=y,r.numSpotLightShadowsWithMaps=b,r.numLightProbes=x,S.sunLength=c,S.directionalLength=d,S.pointLength=f,S.spotLength=p,S.rectAreaLength=m,S.hemiLength=h,S.numSunShadows=l,S.numDirectionalShadows=g,S.numPointShadows=_,S.numSpotShadows=v,S.numSpotMaps=y,S.numLightProbes=x,r.version=Bu++)}function c(e,t){let n=0,s=0,c=0,l=0,u=0,d=0,f=t.matrixWorldInverse;for(let t=0,p=e.length;t<p;t++){let p=e[t];if(p.isSunLight){let e=r.sun[n];e.direction.setFromMatrixPosition(p.matrixWorld),e.direction.transformDirection(f),n++}else if(p.isDirectionalLight){let e=r.directional[s];e.direction.setFromMatrixPosition(p.matrixWorld),i.setFromMatrixPosition(p.target.matrixWorld),e.direction.sub(i),e.direction.transformDirection(f),s++}else if(p.isSpotLight){let e=r.spot[l];e.position.setFromMatrixPosition(p.matrixWorld),e.position.applyMatrix4(f),e.direction.setFromMatrixPosition(p.matrixWorld),i.setFromMatrixPosition(p.target.matrixWorld),e.direction.sub(i),e.direction.transformDirection(f),l++}else if(p.isRectAreaLight){let e=r.rectArea[u];e.position.setFromMatrixPosition(p.matrixWorld),e.position.applyMatrix4(f),o.identity(),a.copy(p.matrixWorld),a.premultiply(f),o.extractRotation(a),e.halfWidth.set(p.width*.5,0,0),e.halfHeight.set(0,p.height*.5,0),e.halfWidth.applyMatrix4(o),e.halfHeight.applyMatrix4(o),u++}else if(p.isPointLight){let e=r.point[c];e.position.setFromMatrixPosition(p.matrixWorld),e.position.applyMatrix4(f),c++}else if(p.isHemisphereLight){let e=r.hemi[d];e.direction.setFromMatrixPosition(p.matrixWorld),e.direction.transformDirection(f),d++}}}return{setup:s,setupView:c,state:r}}function Uu(e){let t=new Hu(e),n=[],r=[],i=[];function a(e){d.camera=e,n.length=0,r.length=0,i.length=0}function o(e){n.push(e)}function s(e){r.push(e)}function c(e){i.push(e)}function l(){t.setup(n)}function u(e){t.setupView(n,e)}let d={lightsArray:n,shadowsArray:r,lightProbeGridArray:i,camera:null,lights:t,transmissionRenderTarget:{},textureUnits:0};return{init:a,state:d,setupLights:l,setupLightsView:u,pushLight:o,pushShadow:s,pushLightProbeGrid:c}}function Wu(e){let t=new WeakMap;function n(n,r=0){let i=t.get(n),a;return i===void 0?(a=new Uu(e),t.set(n,[a])):r>=i.length?(a=new Uu(e),i.push(a)):a=i[r],a}function r(){t=new WeakMap}return{get:n,dispose:r}}var Gu=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Ku=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,qu=[new V(1,0,0),new V(-1,0,0),new V(0,1,0),new V(0,-1,0),new V(0,0,1),new V(0,0,-1)],Ju=[new V(0,-1,0),new V(0,-1,0),new V(0,0,1),new V(0,0,-1),new V(0,-1,0),new V(0,-1,0)],Yu=new ft,Xu=new V,Zu=new V;function Qu(e,t,n){let i=new Wr,a=new z,s=new z,c=new st,l=new uo,u=new fo,m={},h=n.maxTextureSize,g={0:1,1:0,2:2},_=new oo({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new z},radius:{value:4}},vertexShader:Gu,fragmentShader:Ku}),y=_.clone();y.defines.HORIZONTAL_PASS=1;let b=new Hn;b.setAttribute(`position`,new On(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let x=new G(b,_),C=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=1;let w=this.type;this.render=function(t,n,l){if(C.enabled===!1||C.autoUpdate===!1&&C.needsUpdate===!1||t.length===0)return;this.type===2&&(F(`WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead.`),this.type=1);let u=e.getRenderTarget(),m=e.getActiveCubeFace(),g=e.getActiveMipmapLevel(),_=e.state;_.setBlending(0),_.buffers.depth.getReversed()===!0?_.buffers.color.setClear(0,0,0,0):_.buffers.color.setClear(1,1,1,1),_.buffers.depth.setTest(!0),_.setScissorTest(!1);let y=w!==this.type;y&&n.traverse(function(e){e.material&&(Array.isArray(e.material)?e.material.forEach(e=>e.needsUpdate=!0):e.material.needsUpdate=!0)});for(let u=0,m=t.length;u<m;u++){let m=t[u],g=m.shadow;if(g===void 0){F(`WebGLShadowMap:`,m,`has no shadow.`);continue}if(g.autoUpdate===!1&&g.needsUpdate===!1)continue;a.copy(g.mapSize);let b=g.getFrameExtents();a.multiply(b),s.copy(g.mapSize),(a.x>h||a.y>h)&&(a.x>h&&(s.x=Math.floor(h/b.x),a.x=s.x*b.x,g.mapSize.x=s.x),a.y>h&&(s.y=Math.floor(h/b.y),a.y=s.y*b.y,g.mapSize.y=s.y));let x=e.state.buffers.depth.getReversed();if(g.camera._reversedDepth=x,g.map===null||y===!0){if(g.map!==null&&(g.map.depthTexture!==null&&(g.map.depthTexture.dispose(),g.map.depthTexture=null),g.map.dispose()),this.type===3){if(m.isPointLight){F(`WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.`);continue}g.map=new lt(a.x,a.y,{format:S,type:p,minFilter:o,magFilter:o,generateMipmaps:!1}),g.map.texture.name=m.name+`.shadowMap`,g.map.depthTexture=new mi(a.x,a.y,f),g.map.depthTexture.name=m.name+`.shadowMapDepth`,g.map.depthTexture.format=v,g.map.depthTexture.compareFunction=null,g.map.depthTexture.minFilter=r,g.map.depthTexture.magFilter=r}else m.isPointLight?(g.map=new kc(a.x),g.map.depthTexture=new hi(a.x,d)):(g.map=new lt(a.x,a.y),g.map.depthTexture=new mi(a.x,a.y,d)),g.map.depthTexture.name=m.name+`.shadowMap`,g.map.depthTexture.format=v,this.type===1?(g.map.depthTexture.compareFunction=x?518:515,g.map.depthTexture.minFilter=o,g.map.depthTexture.magFilter=o):(g.map.depthTexture.compareFunction=null,g.map.depthTexture.minFilter=r,g.map.depthTexture.magFilter=r);g.camera.updateProjectionMatrix()}g.map.isWebGLCubeRenderTarget!==!0&&(g.map.width!==a.x||g.map.height!==a.y)&&g.map.setSize(a.x,a.y);let C=g.map.isWebGLCubeRenderTarget?6:g.getViewportCount();m.isPointLight!==!0&&g.updateMatrices(m,l);for(let t=0;t<C;t++){let r=g.getCamera(t);if(m.isPointLight){let e=g.camera,n=g.matrix,r=m.distance||e.far;r!==e.far&&(e.far=r,e.updateProjectionMatrix()),Xu.setFromMatrixPosition(m.matrixWorld),e.position.copy(Xu),Zu.copy(e.position),Zu.add(qu[t]),e.up.copy(Ju[t]),e.lookAt(Zu),e.updateMatrixWorld(),n.makeTranslation(-Xu.x,-Xu.y,-Xu.z),Yu.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),g._frustum.setFromProjectionMatrix(Yu,e.coordinateSystem,e.reversedDepth)}if(g.map.isWebGLCubeRenderTarget)e.setRenderTarget(g.map,t),e.clear();else{t===0&&(e.setRenderTarget(g.map),e.clear());let n=g.getViewport(t);c.set(s.x*n.x,s.y*n.y,s.x*n.z,s.y*n.w),_.viewport(c)}i=g.getFrustum(t),D(n,l,r,m,this.type)}g.isPointLightShadow!==!0&&this.type===3&&T(g,l),g.needsUpdate=!1}w=this.type,C.needsUpdate=!1,e.setRenderTarget(u,m,g)};function T(n,r){let i=t.update(x);_.defines.VSM_SAMPLES!==n.blurSamples&&(_.defines.VSM_SAMPLES=n.blurSamples,y.defines.VSM_SAMPLES=n.blurSamples,_.needsUpdate=!0,y.needsUpdate=!0),n.mapPass===null?n.mapPass=new lt(a.x,a.y,{format:S,type:p}):(n.mapPass.width!==n.map.width||n.mapPass.height!==n.map.height)&&n.mapPass.setSize(n.map.width,n.map.height),_.uniforms.shadow_pass.value=n.map.depthTexture,_.uniforms.resolution.value.set(n.map.width,n.map.height),_.uniforms.radius.value=n.radius,e.setRenderTarget(n.mapPass),e.clear(),e.renderBufferDirect(r,null,i,_,x,null),y.uniforms.shadow_pass.value=n.mapPass.texture,y.uniforms.resolution.value.set(n.map.width,n.map.height),y.uniforms.radius.value=n.radius,e.setRenderTarget(n.map),e.clear(),e.renderBufferDirect(r,null,i,y,x,null)}function E(t,n,r,i){let a=null,o=r.isPointLight===!0?t.customDistanceMaterial:t.customDepthMaterial;if(o!==void 0)a=o;else if(a=r.isPointLight===!0?u:l,e.localClippingEnabled&&n.clipShadows===!0&&Array.isArray(n.clippingPlanes)&&n.clippingPlanes.length!==0||n.displacementMap&&n.displacementScale!==0||n.alphaMap&&n.alphaTest>0||n.map&&n.alphaTest>0||n.alphaToCoverage===!0){let e=a.uuid,t=n.uuid,r=m[e];r===void 0&&(r={},m[e]=r);let i=r[t];i===void 0&&(i=a.clone(),r[t]=i,n.addEventListener(`dispose`,O)),a=i}if(a.visible=n.visible,a.wireframe=n.wireframe,i===3?a.side=n.shadowSide===null?n.side:n.shadowSide:a.side=n.shadowSide===null?g[n.side]:n.shadowSide,a.alphaMap=n.alphaMap,a.alphaTest=n.alphaToCoverage===!0?.5:n.alphaTest,a.map=n.map,a.clipShadows=n.clipShadows,a.clippingPlanes=n.clippingPlanes,a.clipIntersection=n.clipIntersection,a.displacementMap=n.displacementMap,a.displacementScale=n.displacementScale,a.displacementBias=n.displacementBias,a.wireframeLinewidth=n.wireframeLinewidth,a.linewidth=n.linewidth,r.isPointLight===!0&&a.isMeshDistanceMaterial===!0){let t=e.properties.get(a);t.light=r}return a}function D(n,r,a,o,s){if(n.visible===!1)return;if(n.layers.test(r.layers)&&(n.isMesh||n.isLine||n.isPoints)&&(n.castShadow||n.receiveShadow&&s===3)&&(!n.frustumCulled||n.intersectsFrustum(i))){n.modelViewMatrix.multiplyMatrices(a.matrixWorldInverse,n.matrixWorld);let i=t.update(n),c=n.material;if(Array.isArray(c)){let t=i.groups;for(let l=0,u=t.length;l<u;l++){let u=t[l],d=c[u.materialIndex];if(d&&d.visible){let t=E(n,d,o,s);n.onBeforeShadow(e,n,r,a,i,t,u),e.renderBufferDirect(a,null,i,t,n,u),n.onAfterShadow(e,n,r,a,i,t,u)}}}else if(c.visible){let t=E(n,c,o,s);n.onBeforeShadow(e,n,r,a,i,t,null),e.renderBufferDirect(a,null,i,t,n,null),n.onAfterShadow(e,n,r,a,i,t,null)}}let c=n.children;for(let e=0,t=c.length;e<t;e++)D(c[e],r,a,o,s)}function O(e){e.target.removeEventListener(`dispose`,O);for(let t in m){let n=m[t],r=e.target.uuid;r in n&&(n[r].dispose(),delete n[r])}}}function $u(e,t){function n(){let t=!1,n=new st,r=null,i=new st(0,0,0,0);return{setMask:function(n){r!==n&&!t&&(e.colorMask(n,n,n,n),r=n)},setLocked:function(e){t=e},setClear:function(t,r,a,o,s){s===!0&&(t*=o,r*=o,a*=o),n.set(t,r,a,o),i.equals(n)===!1&&(e.clearColor(t,r,a,o),i.copy(n))},reset:function(){t=!1,r=null,i.set(-1,0,0,0)}}}function r(){let n=!1,r=!1,i=null,a=null,o=null;return{setReversed:function(e){if(r!==e){let n=t.get(`EXT_clip_control`);e?n.clipControlEXT(n.LOWER_LEFT_EXT,n.ZERO_TO_ONE_EXT):n.clipControlEXT(n.LOWER_LEFT_EXT,n.NEGATIVE_ONE_TO_ONE_EXT),r=e;let i=o;o=null,this.setClear(i)}},getReversed:function(){return r},setTest:function(t){t?le(e.DEPTH_TEST):ue(e.DEPTH_TEST)},setMask:function(t){i!==t&&!n&&(e.depthMask(t),i=t)},setFunc:function(t){if(r&&(t=_e[t]),a!==t){switch(t){case 0:e.depthFunc(e.NEVER);break;case 1:e.depthFunc(e.ALWAYS);break;case 2:e.depthFunc(e.LESS);break;case 3:e.depthFunc(e.LEQUAL);break;case 4:e.depthFunc(e.EQUAL);break;case 5:e.depthFunc(e.GEQUAL);break;case 6:e.depthFunc(e.GREATER);break;case 7:e.depthFunc(e.NOTEQUAL);break;default:e.depthFunc(e.LEQUAL)}a=t}},setLocked:function(e){n=e},setClear:function(t){o!==t&&(o=t,r&&(t=1-t),e.clearDepth(t))},reset:function(){n=!1,i=null,a=null,o=null,r=!1}}}function i(){let t=!1,n=null,r=null,i=null,a=null,o=null,s=null,c=null,l=null;return{setTest:function(n){t||(n?le(e.STENCIL_TEST):ue(e.STENCIL_TEST))},setMask:function(r){n!==r&&!t&&(e.stencilMask(r),n=r)},setFunc:function(t,n,o){(r!==t||i!==n||a!==o)&&(e.stencilFunc(t,n,o),r=t,i=n,a=o)},setOp:function(t,n,r){(o!==t||s!==n||c!==r)&&(e.stencilOp(t,n,r),o=t,s=n,c=r)},setLocked:function(e){t=e},setClear:function(t){l!==t&&(e.clearStencil(t),l=t)},reset:function(){t=!1,n=null,r=null,i=null,a=null,o=null,s=null,c=null,l=null}}}let a=new n,o=new r,s=new i,c=new WeakMap,l=new WeakMap,u={},d={},f={},p=new WeakMap,m=[],h=null,g=!1,_=null,v=null,y=null,b=null,x=null,S=null,C=null,w=new U(0,0,0),T=0,E=!1,D=null,O=null,k=null,A=null,j=null,M=e.getParameter(e.MAX_COMBINED_TEXTURE_IMAGE_UNITS),ee=!1,N=0,te=e.getParameter(e.VERSION);te.indexOf(`WebGL`)===-1?te.indexOf(`OpenGL ES`)!==-1&&(N=parseFloat(/^OpenGL ES (\d)/.exec(te)[1]),ee=N>=2):(N=parseFloat(/^WebGL (\d)/.exec(te)[1]),ee=N>=1);let ne=null,P={},re=e.getParameter(e.SCISSOR_BOX),ie=e.getParameter(e.VIEWPORT),ae=new st().fromArray(re),oe=new st().fromArray(ie);function se(t,n,r,i){let a=new Uint8Array(4),o=e.createTexture();e.bindTexture(t,o),e.texParameteri(t,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(t,e.TEXTURE_MAG_FILTER,e.NEAREST);for(let o=0;o<r;o++)t===e.TEXTURE_3D||t===e.TEXTURE_2D_ARRAY?e.texImage3D(n,0,e.RGBA,1,1,i,0,e.RGBA,e.UNSIGNED_BYTE,a):e.texImage2D(n+o,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,a);return o}let ce={};ce[e.TEXTURE_2D]=se(e.TEXTURE_2D,e.TEXTURE_2D,1),ce[e.TEXTURE_CUBE_MAP]=se(e.TEXTURE_CUBE_MAP,e.TEXTURE_CUBE_MAP_POSITIVE_X,6),ce[e.TEXTURE_2D_ARRAY]=se(e.TEXTURE_2D_ARRAY,e.TEXTURE_2D_ARRAY,1,1),ce[e.TEXTURE_3D]=se(e.TEXTURE_3D,e.TEXTURE_3D,1,1),a.setClear(0,0,0,1),o.setClear(1),s.setClear(0),le(e.DEPTH_TEST),o.setFunc(3),ye(!1),be(1),le(e.CULL_FACE),ge(0);function le(t){u[t]!==!0&&(e.enable(t),u[t]=!0)}function ue(t){u[t]!==!1&&(e.disable(t),u[t]=!1)}function de(t,n){return f[t]!==n&&(e.bindFramebuffer(t,n),f[t]=n,t===e.DRAW_FRAMEBUFFER&&(f[e.FRAMEBUFFER]=n),t===e.FRAMEBUFFER&&(f[e.DRAW_FRAMEBUFFER]=n),!0)}function fe(t,n){let r=m,i=!1;if(t){r=p.get(n),r===void 0&&(r=[],p.set(n,r));let a=t.textures;if(r.length!==a.length||r[0]!==e.COLOR_ATTACHMENT0){for(let t=0,n=a.length;t<n;t++)r[t]=e.COLOR_ATTACHMENT0+t;r.length=a.length,i=!0}}else r[0]!==e.BACK&&(r[0]=e.BACK,i=!0);i&&e.drawBuffers(r)}function pe(t){return h!==t&&(e.useProgram(t),h=t,!0)}let F={100:e.FUNC_ADD,101:e.FUNC_SUBTRACT,102:e.FUNC_REVERSE_SUBTRACT};F[103]=e.MIN,F[104]=e.MAX;let he={200:e.ZERO,201:e.ONE,202:e.SRC_COLOR,204:e.SRC_ALPHA,210:e.SRC_ALPHA_SATURATE,208:e.DST_COLOR,206:e.DST_ALPHA,203:e.ONE_MINUS_SRC_COLOR,205:e.ONE_MINUS_SRC_ALPHA,209:e.ONE_MINUS_DST_COLOR,207:e.ONE_MINUS_DST_ALPHA,211:e.CONSTANT_COLOR,212:e.ONE_MINUS_CONSTANT_COLOR,213:e.CONSTANT_ALPHA,214:e.ONE_MINUS_CONSTANT_ALPHA};function ge(t,n,r,i,a,o,s,c,l,u){if(t===0){g===!0&&(ue(e.BLEND),g=!1);return}if(g===!1&&(le(e.BLEND),g=!0),t!==5){if(t!==_||u!==E){if((v!==100||x!==100)&&(e.blendEquation(e.FUNC_ADD),v=100,x=100),u)switch(t){case 1:e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case 2:e.blendFunc(e.ONE,e.ONE);break;case 3:e.blendFuncSeparate(e.ZERO,e.ONE_MINUS_SRC_COLOR,e.ZERO,e.ONE);break;case 4:e.blendFuncSeparate(e.DST_COLOR,e.ONE_MINUS_SRC_ALPHA,e.ZERO,e.ONE);break;default:me(`WebGLState: Invalid blending: `,t)}else switch(t){case 1:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case 2:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE,e.ONE,e.ONE);break;case 3:me(`WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true`);break;case 4:me(`WebGLState: MultiplyBlending requires material.premultipliedAlpha = true`);break;default:me(`WebGLState: Invalid blending: `,t)}y=null,b=null,S=null,C=null,w.set(0,0,0),T=0,_=t,E=u}return}a||=n,o||=r,s||=i,(n!==v||a!==x)&&(e.blendEquationSeparate(F[n],F[a]),v=n,x=a),(r!==y||i!==b||o!==S||s!==C)&&(e.blendFuncSeparate(he[r],he[i],he[o],he[s]),y=r,b=i,S=o,C=s),(c.equals(w)===!1||l!==T)&&(e.blendColor(c.r,c.g,c.b,l),w.copy(c),T=l),_=t,E=!1}function ve(t,n){t.side===2?ue(e.CULL_FACE):le(e.CULL_FACE);let r=t.side===1;n&&(r=!r),ye(r),t.blending===1&&t.transparent===!1?ge(0):ge(t.blending,t.blendEquation,t.blendSrc,t.blendDst,t.blendEquationAlpha,t.blendSrcAlpha,t.blendDstAlpha,t.blendColor,t.blendAlpha,t.premultipliedAlpha),o.setFunc(t.depthFunc),o.setTest(t.depthTest),o.setMask(t.depthWrite),a.setMask(t.colorWrite);let i=t.stencilWrite;s.setTest(i),i&&(s.setMask(t.stencilWriteMask),s.setFunc(t.stencilFunc,t.stencilRef,t.stencilFuncMask),s.setOp(t.stencilFail,t.stencilZFail,t.stencilZPass)),Se(t.polygonOffset,t.polygonOffsetFactor,t.polygonOffsetUnits),t.alphaToCoverage===!0?le(e.SAMPLE_ALPHA_TO_COVERAGE):ue(e.SAMPLE_ALPHA_TO_COVERAGE)}function ye(t){D!==t&&(t?e.frontFace(e.CW):e.frontFace(e.CCW),D=t)}function be(t){t===0?ue(e.CULL_FACE):(le(e.CULL_FACE),t!==O&&(t===1?e.cullFace(e.BACK):t===2?e.cullFace(e.FRONT):e.cullFace(e.FRONT_AND_BACK))),O=t}function xe(t){t!==k&&(ee&&e.lineWidth(t),k=t)}function Se(t,n,r){t?(le(e.POLYGON_OFFSET_FILL),(A!==n||j!==r)&&(A=n,j=r,o.getReversed()&&(n=-n),e.polygonOffset(n,r))):ue(e.POLYGON_OFFSET_FILL)}function Ce(t){t?le(e.SCISSOR_TEST):ue(e.SCISSOR_TEST)}function I(t){t===void 0&&(t=e.TEXTURE0+M-1),ne!==t&&(e.activeTexture(t),ne=t)}function we(t,n,r){r===void 0&&(r=ne===null?e.TEXTURE0+M-1:ne);let i=P[r];i===void 0&&(i={type:void 0,texture:void 0},P[r]=i),(i.type!==t||i.texture!==n)&&(ne!==r&&(e.activeTexture(r),ne=r),e.bindTexture(t,n||ce[t]),i.type=t,i.texture=n)}function Te(){let t=P[ne];t!==void 0&&t.type!==void 0&&(e.bindTexture(t.type,null),t.type=void 0,t.texture=void 0)}function Ee(){try{e.compressedTexImage2D(...arguments)}catch(e){me(`WebGLState:`,e)}}function De(){try{e.compressedTexImage3D(...arguments)}catch(e){me(`WebGLState:`,e)}}function Oe(){try{e.texSubImage2D(...arguments)}catch(e){me(`WebGLState:`,e)}}function ke(){try{e.texSubImage3D(...arguments)}catch(e){me(`WebGLState:`,e)}}function Ae(){try{e.compressedTexSubImage2D(...arguments)}catch(e){me(`WebGLState:`,e)}}function je(){try{e.compressedTexSubImage3D(...arguments)}catch(e){me(`WebGLState:`,e)}}function Me(){try{e.texStorage2D(...arguments)}catch(e){me(`WebGLState:`,e)}}function Ne(){try{e.texStorage3D(...arguments)}catch(e){me(`WebGLState:`,e)}}function Pe(){try{e.texImage2D(...arguments)}catch(e){me(`WebGLState:`,e)}}function Fe(){try{e.texImage3D(...arguments)}catch(e){me(`WebGLState:`,e)}}function Ie(t){return d[t]===void 0?e.getParameter(t):d[t]}function Le(t,n){d[t]!==n&&(e.pixelStorei(t,n),d[t]=n)}function Re(t){ae.equals(t)===!1&&(e.scissor(t.x,t.y,t.z,t.w),ae.copy(t))}function L(t){oe.equals(t)===!1&&(e.viewport(t.x,t.y,t.z,t.w),oe.copy(t))}function ze(t,n){let r=l.get(n);r===void 0&&(r=new WeakMap,l.set(n,r));let i=r.get(t);i===void 0&&(i=e.getUniformBlockIndex(n,t.name),r.set(t,i))}function Be(t,n){let r=l.get(n).get(t);c.get(n)!==r&&(e.uniformBlockBinding(n,r,t.__bindingPointIndex),c.set(n,r))}function Ve(){e.disable(e.BLEND),e.disable(e.CULL_FACE),e.disable(e.DEPTH_TEST),e.disable(e.POLYGON_OFFSET_FILL),e.disable(e.SCISSOR_TEST),e.disable(e.STENCIL_TEST),e.disable(e.SAMPLE_ALPHA_TO_COVERAGE),e.blendEquation(e.FUNC_ADD),e.blendFunc(e.ONE,e.ZERO),e.blendFuncSeparate(e.ONE,e.ZERO,e.ONE,e.ZERO),e.blendColor(0,0,0,0),e.colorMask(!0,!0,!0,!0),e.clearColor(0,0,0,0),e.depthMask(!0),e.depthFunc(e.LESS),o.setReversed(!1),e.clearDepth(1),e.stencilMask(4294967295),e.stencilFunc(e.ALWAYS,0,4294967295),e.stencilOp(e.KEEP,e.KEEP,e.KEEP),e.clearStencil(0),e.cullFace(e.BACK),e.frontFace(e.CCW),e.polygonOffset(0,0),e.activeTexture(e.TEXTURE0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),e.bindFramebuffer(e.READ_FRAMEBUFFER,null),e.useProgram(null),e.lineWidth(1),e.scissor(0,0,e.canvas.width,e.canvas.height),e.viewport(0,0,e.canvas.width,e.canvas.height),e.pixelStorei(e.PACK_ALIGNMENT,4),e.pixelStorei(e.UNPACK_ALIGNMENT,4),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!1),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,e.BROWSER_DEFAULT_WEBGL),e.pixelStorei(e.PACK_ROW_LENGTH,0),e.pixelStorei(e.PACK_SKIP_PIXELS,0),e.pixelStorei(e.PACK_SKIP_ROWS,0),e.pixelStorei(e.UNPACK_ROW_LENGTH,0),e.pixelStorei(e.UNPACK_IMAGE_HEIGHT,0),e.pixelStorei(e.UNPACK_SKIP_PIXELS,0),e.pixelStorei(e.UNPACK_SKIP_ROWS,0),e.pixelStorei(e.UNPACK_SKIP_IMAGES,0),u={},d={},ne=null,P={},f={},p=new WeakMap,m=[],h=null,g=!1,_=null,v=null,y=null,b=null,x=null,S=null,C=null,w=new U(0,0,0),T=0,E=!1,D=null,O=null,k=null,A=null,j=null,ae.set(0,0,e.canvas.width,e.canvas.height),oe.set(0,0,e.canvas.width,e.canvas.height),a.reset(),o.reset(),s.reset()}return{buffers:{color:a,depth:o,stencil:s},enable:le,disable:ue,bindFramebuffer:de,drawBuffers:fe,useProgram:pe,setBlending:ge,setMaterial:ve,setFlipSided:ye,setCullFace:be,setLineWidth:xe,setPolygonOffset:Se,setScissorTest:Ce,activeTexture:I,bindTexture:we,unbindTexture:Te,compressedTexImage2D:Ee,compressedTexImage3D:De,texImage2D:Pe,texImage3D:Fe,pixelStorei:Le,getParameter:Ie,updateUBOMapping:ze,uniformBlockBinding:Be,texStorage2D:Me,texStorage3D:Ne,texSubImage2D:Oe,texSubImage3D:ke,compressedTexSubImage2D:Ae,compressedTexSubImage3D:je,scissor:Re,viewport:L,reset:Ve}}function ed(l,u,d,f,p,m,h){let g=u.has(`WEBGL_multisampled_render_to_texture`)?u.get(`WEBGL_multisampled_render_to_texture`):null,_=typeof navigator>`u`?!1:/OculusBrowser/g.test(navigator.userAgent),v=new z,b=new WeakMap,x=new Set,S,C=new WeakMap,w=!1;try{w=typeof OffscreenCanvas<`u`&&new OffscreenCanvas(1,1).getContext(`2d`)!==null}catch{}function T(e,t){return w?new OffscreenCanvas(e,t):le(`canvas`)}function E(e,t,n){let r=1,i=Re(e);if((i.width>n||i.height>n)&&(r=n/Math.max(i.width,i.height)),r<1){if(typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap||typeof VideoFrame<`u`&&e instanceof VideoFrame){let n=Math.floor(r*i.width),a=Math.floor(r*i.height);S===void 0&&(S=T(n,a));let o=t?T(n,a):S;return o.width=n,o.height=a,o.getContext(`2d`).drawImage(e,0,0,n,a),F(`WebGLRenderer: Texture has been resized from (`+i.width+`x`+i.height+`) to (`+n+`x`+a+`).`),o}return`data`in e&&F(`WebGLRenderer: Image in DataTexture is too big (`+i.width+`x`+i.height+`).`),e}return e}function D(e){return e.generateMipmaps}function O(e){l.generateMipmap(e)}function k(e){return e.isWebGLCubeRenderTarget?l.TEXTURE_CUBE_MAP:e.isWebGL3DRenderTarget?l.TEXTURE_3D:e.isWebGLArrayRenderTarget||e.isCompressedArrayTexture?l.TEXTURE_2D_ARRAY:l.TEXTURE_2D}function A(e,t,n,r,i,a=!1){if(e!==null){if(l[e]!==void 0)return l[e];F(`WebGLRenderer: Attempt to use non-existing WebGL internal format '`+e+`'`)}let o;r&&(o=u.get(`EXT_texture_norm16`),o||F(`WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension`));let s=t;if(t===l.RED&&(n===l.FLOAT&&(s=l.R32F),n===l.HALF_FLOAT&&(s=l.R16F),n===l.UNSIGNED_BYTE&&(s=l.R8),n===l.UNSIGNED_SHORT&&o&&(s=o.R16_EXT),n===l.SHORT&&o&&(s=o.R16_SNORM_EXT)),t===l.RED_INTEGER&&(n===l.UNSIGNED_BYTE&&(s=l.R8UI),n===l.UNSIGNED_SHORT&&(s=l.R16UI),n===l.UNSIGNED_INT&&(s=l.R32UI),n===l.BYTE&&(s=l.R8I),n===l.SHORT&&(s=l.R16I),n===l.INT&&(s=l.R32I)),t===l.RG&&(n===l.FLOAT&&(s=l.RG32F),n===l.HALF_FLOAT&&(s=l.RG16F),n===l.UNSIGNED_BYTE&&(s=l.RG8),n===l.UNSIGNED_SHORT&&o&&(s=o.RG16_EXT),n===l.SHORT&&o&&(s=o.RG16_SNORM_EXT)),t===l.RG_INTEGER&&(n===l.UNSIGNED_BYTE&&(s=l.RG8UI),n===l.UNSIGNED_SHORT&&(s=l.RG16UI),n===l.UNSIGNED_INT&&(s=l.RG32UI),n===l.BYTE&&(s=l.RG8I),n===l.SHORT&&(s=l.RG16I),n===l.INT&&(s=l.RG32I)),t===l.RGB_INTEGER&&(n===l.UNSIGNED_BYTE&&(s=l.RGB8UI),n===l.UNSIGNED_SHORT&&(s=l.RGB16UI),n===l.UNSIGNED_INT&&(s=l.RGB32UI),n===l.BYTE&&(s=l.RGB8I),n===l.SHORT&&(s=l.RGB16I),n===l.INT&&(s=l.RGB32I)),t===l.RGBA_INTEGER&&(n===l.UNSIGNED_BYTE&&(s=l.RGBA8UI),n===l.UNSIGNED_SHORT&&(s=l.RGBA16UI),n===l.UNSIGNED_INT&&(s=l.RGBA32UI),n===l.BYTE&&(s=l.RGBA8I),n===l.SHORT&&(s=l.RGBA16I),n===l.INT&&(s=l.RGBA32I)),t===l.RGB&&(n===l.UNSIGNED_SHORT&&o&&(s=o.RGB16_EXT),n===l.SHORT&&o&&(s=o.RGB16_SNORM_EXT),n===l.UNSIGNED_INT_5_9_9_9_REV&&(s=l.RGB9_E5),n===l.UNSIGNED_INT_10F_11F_11F_REV&&(s=l.R11F_G11F_B10F)),t===l.RGBA){let e=a?ne:Xe.getTransfer(i);n===l.FLOAT&&(s=l.RGBA32F),n===l.HALF_FLOAT&&(s=l.RGBA16F),n===l.UNSIGNED_BYTE&&(s=e===`srgb`?l.SRGB8_ALPHA8:l.RGBA8),n===l.UNSIGNED_SHORT&&o&&(s=o.RGBA16_EXT),n===l.SHORT&&o&&(s=o.RGBA16_SNORM_EXT),n===l.UNSIGNED_SHORT_4_4_4_4&&(s=l.RGBA4),n===l.UNSIGNED_SHORT_5_5_5_1&&(s=l.RGB5_A1)}return(s===l.R16F||s===l.R32F||s===l.RG16F||s===l.RG32F||s===l.RGBA16F||s===l.RGBA32F)&&u.get(`EXT_color_buffer_float`),s}function j(e,t){let n;return e?t===null||t===1014||t===1020?n=l.DEPTH24_STENCIL8:t===1015?n=l.DEPTH32F_STENCIL8:t===1012&&(n=l.DEPTH24_STENCIL8,F(`DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.`)):t===null||t===1014||t===1020?n=l.DEPTH_COMPONENT24:t===1015?n=l.DEPTH_COMPONENT32F:t===1012&&(n=l.DEPTH_COMPONENT16),n}function M(e,t){return D(e)===!0||e.isFramebufferTexture&&e.minFilter!==1003&&e.minFilter!==1006?Math.log2(Math.max(t.width,t.height))+1:e.mipmaps!==void 0&&e.mipmaps.length>0?e.mipmaps.length:e.isCompressedTexture&&Array.isArray(e.image)?t.mipmaps.length:1}function ee(e){let t=e.target;t.removeEventListener(`dispose`,ee),te(t),t.isVideoTexture&&b.delete(t),t.isHTMLTexture&&x.delete(t)}function N(e){let t=e.target;t.removeEventListener(`dispose`,N),re(t)}function te(e){let t=f.get(e);if(t.__webglInit===void 0)return;let n=e.source,r=C.get(n);if(r){let i=r[t.__cacheKey];i.usedTimes--,i.usedTimes===0&&P(e),Object.keys(r).length===0&&C.delete(n)}f.remove(e)}function P(e){let t=f.get(e);l.deleteTexture(t.__webglTexture);let n=e.source,r=C.get(n);delete r[t.__cacheKey],h.memory.textures--}function re(e){let t=f.get(e);if(e.depthTexture&&(e.depthTexture.dispose(),f.remove(e.depthTexture)),e.isWebGLCubeRenderTarget)for(let e=0;e<6;e++){if(Array.isArray(t.__webglFramebuffer[e]))for(let n=0;n<t.__webglFramebuffer[e].length;n++)l.deleteFramebuffer(t.__webglFramebuffer[e][n]);else l.deleteFramebuffer(t.__webglFramebuffer[e]);t.__webglDepthbuffer&&l.deleteRenderbuffer(t.__webglDepthbuffer[e])}else{if(Array.isArray(t.__webglFramebuffer))for(let e=0;e<t.__webglFramebuffer.length;e++)l.deleteFramebuffer(t.__webglFramebuffer[e]);else l.deleteFramebuffer(t.__webglFramebuffer);if(t.__webglDepthbuffer&&l.deleteRenderbuffer(t.__webglDepthbuffer),t.__webglMultisampledFramebuffer&&l.deleteFramebuffer(t.__webglMultisampledFramebuffer),t.__webglColorRenderbuffer)for(let e=0;e<t.__webglColorRenderbuffer.length;e++)t.__webglColorRenderbuffer[e]&&l.deleteRenderbuffer(t.__webglColorRenderbuffer[e]);t.__webglDepthRenderbuffer&&l.deleteRenderbuffer(t.__webglDepthRenderbuffer)}let n=e.textures;for(let e=0,t=n.length;e<t;e++){let t=f.get(n[e]);t.__webglTexture&&(l.deleteTexture(t.__webglTexture),h.memory.textures--),f.remove(n[e])}f.remove(e)}let ie=0;function ae(){ie=0}function oe(){return ie}function se(e){ie=e}function ce(){let e=ie;return e>=p.maxTextures&&F(`WebGLTextures: Trying to use `+(e+1)+` texture units while this GPU supports only `+p.maxTextures),ie+=1,e}function ue(e){let t=[];return t.push(e.wrapS),t.push(e.wrapT),t.push(e.wrapR||0),t.push(e.magFilter),t.push(e.minFilter),t.push(e.anisotropy),t.push(e.internalFormat),t.push(e.format),t.push(e.type),t.push(e.generateMipmaps),t.push(e.premultiplyAlpha),t.push(e.flipY),t.push(e.unpackAlignment),t.push(e.colorSpace),t.join()}function de(e,t){let n=f.get(e);if(e.isVideoTexture&&Ie(e),e.isRenderTargetTexture===!1&&e.isExternalTexture!==!0&&e.version>0&&n.__version!==e.version){let r=e.image;if(r===null)F(`WebGLRenderer: Texture marked for update but no image data found.`);else if(r.complete===!1)F(`WebGLRenderer: Texture marked for update but image is incomplete`);else{Ce(n,e,t);return}}else e.isExternalTexture&&(n.__webglTexture=e.sourceTexture?e.sourceTexture:null);d.bindTexture(l.TEXTURE_2D,n.__webglTexture,l.TEXTURE0+t)}function fe(e,t){let n=f.get(e);if(e.isRenderTargetTexture===!1&&e.version>0&&n.__version!==e.version){Ce(n,e,t);return}e.isExternalTexture&&(n.__webglTexture=e.sourceTexture?e.sourceTexture:null),d.bindTexture(l.TEXTURE_2D_ARRAY,n.__webglTexture,l.TEXTURE0+t)}function pe(e,t){let n=f.get(e);if(e.isRenderTargetTexture===!1&&e.version>0&&n.__version!==e.version){Ce(n,e,t);return}d.bindTexture(l.TEXTURE_3D,n.__webglTexture,l.TEXTURE0+t)}function he(e,t){let n=f.get(e);if(e.isCubeDepthTexture!==!0&&e.version>0&&n.__version!==e.version){I(n,e,t);return}d.bindTexture(l.TEXTURE_CUBE_MAP,n.__webglTexture,l.TEXTURE0+t)}let ge={[e]:l.REPEAT,[t]:l.CLAMP_TO_EDGE,[n]:l.MIRRORED_REPEAT},_e={[r]:l.NEAREST,[i]:l.NEAREST_MIPMAP_NEAREST,[a]:l.NEAREST_MIPMAP_LINEAR,[o]:l.LINEAR,[s]:l.LINEAR_MIPMAP_NEAREST,[c]:l.LINEAR_MIPMAP_LINEAR},ve={512:l.NEVER,519:l.ALWAYS,513:l.LESS,515:l.LEQUAL,514:l.EQUAL,518:l.GEQUAL,516:l.GREATER,517:l.NOTEQUAL};function ye(e,t){if(t.type===1015&&u.has(`OES_texture_float_linear`)===!1&&(t.magFilter===1006||t.magFilter===1007||t.magFilter===1005||t.magFilter===1008||t.minFilter===1006||t.minFilter===1007||t.minFilter===1005||t.minFilter===1008)&&F(`WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device.`),l.texParameteri(e,l.TEXTURE_WRAP_S,ge[t.wrapS]),l.texParameteri(e,l.TEXTURE_WRAP_T,ge[t.wrapT]),(e===l.TEXTURE_3D||e===l.TEXTURE_2D_ARRAY)&&l.texParameteri(e,l.TEXTURE_WRAP_R,ge[t.wrapR]),l.texParameteri(e,l.TEXTURE_MAG_FILTER,_e[t.magFilter]),l.texParameteri(e,l.TEXTURE_MIN_FILTER,_e[t.minFilter]),t.compareFunction&&(l.texParameteri(e,l.TEXTURE_COMPARE_MODE,l.COMPARE_REF_TO_TEXTURE),l.texParameteri(e,l.TEXTURE_COMPARE_FUNC,ve[t.compareFunction])),u.has(`EXT_texture_filter_anisotropic`)===!0){if(t.magFilter===1003||t.minFilter!==1005&&t.minFilter!==1008||t.type===1015&&u.has(`OES_texture_float_linear`)===!1)return;if(t.anisotropy>1||f.get(t).__currentAnisotropy){let n=u.get(`EXT_texture_filter_anisotropic`);l.texParameterf(e,n.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(t.anisotropy,p.getMaxAnisotropy())),f.get(t).__currentAnisotropy=t.anisotropy}}}function be(e,t){let n=!1;e.__webglInit===void 0&&(e.__webglInit=!0,t.addEventListener(`dispose`,ee));let r=t.source,i=C.get(r);i===void 0&&(i={},C.set(r,i));let a=ue(t);if(a!==e.__cacheKey){i[a]===void 0&&(i[a]={texture:l.createTexture(),usedTimes:0},h.memory.textures++,n=!0),i[a].usedTimes++;let r=i[e.__cacheKey];r!==void 0&&(i[e.__cacheKey].usedTimes--,r.usedTimes===0&&P(t)),e.__cacheKey=a,e.__webglTexture=i[a].texture}return n}function xe(e,t,n){return Math.floor(Math.floor(e/n)/t)}function Se(e,t,n,r){let i=e.updateRanges;if(i.length===0)d.texSubImage2D(l.TEXTURE_2D,0,0,0,t.width,t.height,n,r,t.data);else{i.sort((e,t)=>e.start-t.start);let a=0;for(let e=1;e<i.length;e++){let n=i[a],r=i[e],o=n.start+n.count,s=xe(r.start,t.width,4),c=xe(n.start,t.width,4);r.start<=o+1&&s===c&&xe(r.start+r.count-1,t.width,4)===s?n.count=Math.max(n.count,r.start+r.count-n.start):(++a,i[a]=r)}i.length=a+1;let o=d.getParameter(l.UNPACK_ROW_LENGTH),s=d.getParameter(l.UNPACK_SKIP_PIXELS),c=d.getParameter(l.UNPACK_SKIP_ROWS);d.pixelStorei(l.UNPACK_ROW_LENGTH,t.width);for(let e=0,a=i.length;e<a;e++){let a=i[e],o=Math.floor(a.start/4),s=Math.ceil(a.count/4),c=o%t.width,u=Math.floor(o/t.width),f=s;d.pixelStorei(l.UNPACK_SKIP_PIXELS,c),d.pixelStorei(l.UNPACK_SKIP_ROWS,u),d.texSubImage2D(l.TEXTURE_2D,0,c,u,f,1,n,r,t.data)}e.clearUpdateRanges(),d.pixelStorei(l.UNPACK_ROW_LENGTH,o),d.pixelStorei(l.UNPACK_SKIP_PIXELS,s),d.pixelStorei(l.UNPACK_SKIP_ROWS,c)}}function Ce(e,t,n){let r=l.TEXTURE_2D;(t.isDataArrayTexture||t.isCompressedArrayTexture)&&(r=l.TEXTURE_2D_ARRAY),t.isData3DTexture&&(r=l.TEXTURE_3D);let i=be(e,t),a=t.source;d.bindTexture(r,e.__webglTexture,l.TEXTURE0+n);let o=f.get(a);if(a.version!==o.__version||i===!0){if(d.activeTexture(l.TEXTURE0+n),!(typeof ImageBitmap<`u`&&t.image instanceof ImageBitmap)){let e=Xe.getPrimaries(Xe.workingColorSpace),n=t.colorSpace===``?null:Xe.getPrimaries(t.colorSpace),r=t.colorSpace===``||e===n?l.NONE:l.BROWSER_DEFAULT_WEBGL;d.pixelStorei(l.UNPACK_FLIP_Y_WEBGL,t.flipY),d.pixelStorei(l.UNPACK_PREMULTIPLY_ALPHA_WEBGL,t.premultiplyAlpha),d.pixelStorei(l.UNPACK_COLORSPACE_CONVERSION_WEBGL,r)}d.pixelStorei(l.UNPACK_ALIGNMENT,t.unpackAlignment);let e=E(t.image,!1,p.maxTextureSize);e=Le(t,e);let s=m.convert(t.format,t.colorSpace),c=m.convert(t.type),u=A(t.internalFormat,s,c,t.normalized,t.colorSpace,t.isVideoTexture);ye(r,t);let f,h=t.mipmaps,g=t.isVideoTexture!==!0,_=o.__version===void 0||i===!0,v=a.dataReady,b=M(t,e);if(t.isDepthTexture)u=j(t.format===y,t.type),_&&(g?d.texStorage2D(l.TEXTURE_2D,1,u,e.width,e.height):d.texImage2D(l.TEXTURE_2D,0,u,e.width,e.height,0,s,c,null));else if(t.isDataTexture){if(h.length>0){g&&_&&d.texStorage2D(l.TEXTURE_2D,b,u,h[0].width,h[0].height);for(let e=0,t=h.length;e<t;e++)f=h[e],g?v&&d.texSubImage2D(l.TEXTURE_2D,e,0,0,f.width,f.height,s,c,f.data):d.texImage2D(l.TEXTURE_2D,e,u,f.width,f.height,0,s,c,f.data);t.generateMipmaps=!1}else g?(_&&d.texStorage2D(l.TEXTURE_2D,b,u,e.width,e.height),v&&Se(t,e,s,c)):d.texImage2D(l.TEXTURE_2D,0,u,e.width,e.height,0,s,c,e.data)}else if(t.isCompressedTexture){if(t.isCompressedArrayTexture){g&&_&&d.texStorage3D(l.TEXTURE_2D_ARRAY,b,u,h[0].width,h[0].height,e.depth);for(let n=0,r=h.length;n<r;n++)if(f=h[n],t.format!==1023){if(s!==null){if(g){if(v){if(t.layerUpdates.size>0){let e=Js(f.width,f.height,t.format,t.type);for(let r of t.layerUpdates){let t=f.data.subarray(r*e/f.data.BYTES_PER_ELEMENT,(r+1)*e/f.data.BYTES_PER_ELEMENT);d.compressedTexSubImage3D(l.TEXTURE_2D_ARRAY,n,0,0,r,f.width,f.height,1,s,t)}}else d.compressedTexSubImage3D(l.TEXTURE_2D_ARRAY,n,0,0,0,f.width,f.height,e.depth,s,f.data)}}else d.compressedTexImage3D(l.TEXTURE_2D_ARRAY,n,u,f.width,f.height,e.depth,0,f.data,0,0)}else F(`WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()`)}else g?v&&d.texSubImage3D(l.TEXTURE_2D_ARRAY,n,0,0,0,f.width,f.height,e.depth,s,c,f.data):d.texImage3D(l.TEXTURE_2D_ARRAY,n,u,f.width,f.height,e.depth,0,s,c,f.data);t.layerUpdates.size>0&&t.clearLayerUpdates()}else{g&&_&&d.texStorage2D(l.TEXTURE_2D,b,u,h[0].width,h[0].height);for(let e=0,n=h.length;e<n;e++)f=h[e],t.format===1023?g?v&&d.texSubImage2D(l.TEXTURE_2D,e,0,0,f.width,f.height,s,c,f.data):d.texImage2D(l.TEXTURE_2D,e,u,f.width,f.height,0,s,c,f.data):s===null?F(`WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()`):g?v&&d.compressedTexSubImage2D(l.TEXTURE_2D,e,0,0,f.width,f.height,s,f.data):d.compressedTexImage2D(l.TEXTURE_2D,e,u,f.width,f.height,0,f.data)}}else if(t.isDataArrayTexture){if(g){if(_&&d.texStorage3D(l.TEXTURE_2D_ARRAY,b,u,e.width,e.height,e.depth),v){if(t.layerUpdates.size>0){let n=Js(e.width,e.height,t.format,t.type);for(let r of t.layerUpdates){let t=e.data.subarray(r*n/e.data.BYTES_PER_ELEMENT,(r+1)*n/e.data.BYTES_PER_ELEMENT);d.texSubImage3D(l.TEXTURE_2D_ARRAY,0,0,0,r,e.width,e.height,1,s,c,t)}t.clearLayerUpdates()}else d.texSubImage3D(l.TEXTURE_2D_ARRAY,0,0,0,0,e.width,e.height,e.depth,s,c,e.data)}}else d.texImage3D(l.TEXTURE_2D_ARRAY,0,u,e.width,e.height,e.depth,0,s,c,e.data)}else if(t.isData3DTexture)g?(_&&d.texStorage3D(l.TEXTURE_3D,b,u,e.width,e.height,e.depth),v&&d.texSubImage3D(l.TEXTURE_3D,0,0,0,0,e.width,e.height,e.depth,s,c,e.data)):d.texImage3D(l.TEXTURE_3D,0,u,e.width,e.height,e.depth,0,s,c,e.data);else if(t.isFramebufferTexture){if(_){if(g)d.texStorage2D(l.TEXTURE_2D,b,u,e.width,e.height);else{let t=e.width,n=e.height;for(let e=0;e<b;e++)d.texImage2D(l.TEXTURE_2D,e,u,t,n,0,s,c,null),t>>=1,n>>=1}}}else if(t.isHTMLTexture){if(`texElementImage2D`in l){let n=l.canvas;if(n.hasAttribute(`layoutsubtree`)||n.setAttribute(`layoutsubtree`,`true`),e.parentNode!==n){n.appendChild(e),x.add(t),n.onpaint=e=>{let t=e.changedElements;for(let e of x)t.includes(e.image)&&(e.needsUpdate=!0)},n.requestPaint();return}if(l.texElementImage2D.length===3)l.texElementImage2D(l.TEXTURE_2D,l.RGBA8,e);else{let t=l.RGBA,n=l.RGBA,r=l.UNSIGNED_BYTE;l.texElementImage2D(l.TEXTURE_2D,0,t,n,r,e)}l.texParameteri(l.TEXTURE_2D,l.TEXTURE_MIN_FILTER,l.LINEAR),l.texParameteri(l.TEXTURE_2D,l.TEXTURE_WRAP_S,l.CLAMP_TO_EDGE),l.texParameteri(l.TEXTURE_2D,l.TEXTURE_WRAP_T,l.CLAMP_TO_EDGE)}}else if(h.length>0){if(g&&_){let e=Re(h[0]);d.texStorage2D(l.TEXTURE_2D,b,u,e.width,e.height)}for(let e=0,t=h.length;e<t;e++)f=h[e],g?v&&d.texSubImage2D(l.TEXTURE_2D,e,0,0,s,c,f):d.texImage2D(l.TEXTURE_2D,e,u,s,c,f);t.generateMipmaps=!1}else if(g){if(_){let t=Re(e);d.texStorage2D(l.TEXTURE_2D,b,u,t.width,t.height)}v&&d.texSubImage2D(l.TEXTURE_2D,0,0,0,s,c,e)}else d.texImage2D(l.TEXTURE_2D,0,u,s,c,e);D(t)&&O(r),o.__version=a.version,t.onUpdate&&t.onUpdate(t)}e.__version=t.version}function I(e,t,n){if(t.image.length!==6)return;let r=be(e,t),i=t.source;d.bindTexture(l.TEXTURE_CUBE_MAP,e.__webglTexture,l.TEXTURE0+n);let a=f.get(i);if(i.version!==a.__version||r===!0){d.activeTexture(l.TEXTURE0+n);let e=Xe.getPrimaries(Xe.workingColorSpace),o=t.colorSpace===``?null:Xe.getPrimaries(t.colorSpace),s=t.colorSpace===``||e===o?l.NONE:l.BROWSER_DEFAULT_WEBGL;d.pixelStorei(l.UNPACK_FLIP_Y_WEBGL,t.flipY),d.pixelStorei(l.UNPACK_PREMULTIPLY_ALPHA_WEBGL,t.premultiplyAlpha),d.pixelStorei(l.UNPACK_ALIGNMENT,t.unpackAlignment),d.pixelStorei(l.UNPACK_COLORSPACE_CONVERSION_WEBGL,s);let c=t.isCompressedTexture||t.image[0].isCompressedTexture,u=t.image[0]&&t.image[0].isDataTexture,f=[];for(let e=0;e<6;e++)!c&&!u?f[e]=E(t.image[e],!0,p.maxCubemapSize):f[e]=u?t.image[e].image:t.image[e],f[e]=Le(t,f[e]);let h=f[0],g=m.convert(t.format,t.colorSpace),_=m.convert(t.type),v=A(t.internalFormat,g,_,t.normalized,t.colorSpace),y=t.isVideoTexture!==!0,b=a.__version===void 0||r===!0,x=i.dataReady,S=M(t,h);ye(l.TEXTURE_CUBE_MAP,t);let C;if(c){y&&b&&d.texStorage2D(l.TEXTURE_CUBE_MAP,S,v,h.width,h.height);for(let e=0;e<6;e++){C=f[e].mipmaps;for(let n=0;n<C.length;n++){let r=C[n];t.format===1023?y?x&&d.texSubImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+e,n,0,0,r.width,r.height,g,_,r.data):d.texImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+e,n,v,r.width,r.height,0,g,_,r.data):g===null?F(`WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()`):y?x&&d.compressedTexSubImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+e,n,0,0,r.width,r.height,g,r.data):d.compressedTexImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+e,n,v,r.width,r.height,0,r.data)}}}else{if(C=t.mipmaps,y&&b){C.length>0&&S++;let e=Re(f[0]);d.texStorage2D(l.TEXTURE_CUBE_MAP,S,v,e.width,e.height)}for(let e=0;e<6;e++)if(u){y?x&&d.texSubImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+e,0,0,0,f[e].width,f[e].height,g,_,f[e].data):d.texImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+e,0,v,f[e].width,f[e].height,0,g,_,f[e].data);for(let t=0;t<C.length;t++){let n=C[t].image[e].image;y?x&&d.texSubImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+e,t+1,0,0,n.width,n.height,g,_,n.data):d.texImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+e,t+1,v,n.width,n.height,0,g,_,n.data)}}else{y?x&&d.texSubImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+e,0,0,0,g,_,f[e]):d.texImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+e,0,v,g,_,f[e]);for(let t=0;t<C.length;t++){let n=C[t];y?x&&d.texSubImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+e,t+1,0,0,g,_,n.image[e]):d.texImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+e,t+1,v,g,_,n.image[e])}}}D(t)&&O(l.TEXTURE_CUBE_MAP),a.__version=i.version,t.onUpdate&&t.onUpdate(t)}e.__version=t.version}function we(e,t,n,r,i,a){let o=m.convert(n.format,n.colorSpace),s=m.convert(n.type),c=A(n.internalFormat,o,s,n.normalized,n.colorSpace),u=f.get(t),p=f.get(n);if(p.__renderTarget=t,!u.__hasExternalTextures){let e=Math.max(1,t.width>>a),n=Math.max(1,t.height>>a);i===l.TEXTURE_3D||i===l.TEXTURE_2D_ARRAY?d.texImage3D(i,a,c,e,n,t.depth,0,o,s,null):d.texImage2D(i,a,c,e,n,0,o,s,null)}d.bindFramebuffer(l.FRAMEBUFFER,e),Fe(t)?g.framebufferTexture2DMultisampleEXT(l.FRAMEBUFFER,r,i,p.__webglTexture,0,Pe(t)):(i===l.TEXTURE_2D||i>=l.TEXTURE_CUBE_MAP_POSITIVE_X&&i<=l.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&l.framebufferTexture2D(l.FRAMEBUFFER,r,i,p.__webglTexture,a),d.bindFramebuffer(l.FRAMEBUFFER,null)}function Te(e,t,n){if(l.bindRenderbuffer(l.RENDERBUFFER,e),t.depthBuffer){let r=t.depthTexture,i=r&&r.isDepthTexture?r.type:null,a=j(t.stencilBuffer,i),o=t.stencilBuffer?l.DEPTH_STENCIL_ATTACHMENT:l.DEPTH_ATTACHMENT;Fe(t)?g.renderbufferStorageMultisampleEXT(l.RENDERBUFFER,Pe(t),a,t.width,t.height):n?l.renderbufferStorageMultisample(l.RENDERBUFFER,Pe(t),a,t.width,t.height):l.renderbufferStorage(l.RENDERBUFFER,a,t.width,t.height),l.framebufferRenderbuffer(l.FRAMEBUFFER,o,l.RENDERBUFFER,e)}else{let e=t.textures;for(let r=0;r<e.length;r++){let i=e[r],a=m.convert(i.format,i.colorSpace),o=m.convert(i.type),s=A(i.internalFormat,a,o,i.normalized,i.colorSpace);Fe(t)?g.renderbufferStorageMultisampleEXT(l.RENDERBUFFER,Pe(t),s,t.width,t.height):n?l.renderbufferStorageMultisample(l.RENDERBUFFER,Pe(t),s,t.width,t.height):l.renderbufferStorage(l.RENDERBUFFER,s,t.width,t.height)}}l.bindRenderbuffer(l.RENDERBUFFER,null)}function Ee(e,t,n){let r=t.isWebGLCubeRenderTarget===!0;if(d.bindFramebuffer(l.FRAMEBUFFER,e),!(t.depthTexture&&t.depthTexture.isDepthTexture))throw Error(`THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.`);let i=f.get(t.depthTexture);if(i.__renderTarget=t,(!i.__webglTexture||t.depthTexture.image.width!==t.width||t.depthTexture.image.height!==t.height)&&(t.depthTexture.image.width=t.width,t.depthTexture.image.height=t.height,t.depthTexture.needsUpdate=!0),r){if(i.__webglInit===void 0&&(i.__webglInit=!0,t.depthTexture.addEventListener(`dispose`,ee)),i.__webglTexture===void 0){i.__webglTexture=l.createTexture(),d.bindTexture(l.TEXTURE_CUBE_MAP,i.__webglTexture),ye(l.TEXTURE_CUBE_MAP,t.depthTexture);let e=m.convert(t.depthTexture.format),n=m.convert(t.depthTexture.type),r;t.depthTexture.format===1026?r=l.DEPTH_COMPONENT24:t.depthTexture.format===1027&&(r=l.DEPTH24_STENCIL8);for(let i=0;i<6;i++)l.texImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+i,0,r,t.width,t.height,0,e,n,null)}}else de(t.depthTexture,0);let a=i.__webglTexture,o=Pe(t),s=r?l.TEXTURE_CUBE_MAP_POSITIVE_X+n:l.TEXTURE_2D,c=t.depthTexture.format===1027?l.DEPTH_STENCIL_ATTACHMENT:l.DEPTH_ATTACHMENT;if(t.depthTexture.format===1026)Fe(t)?g.framebufferTexture2DMultisampleEXT(l.FRAMEBUFFER,c,s,a,0,o):l.framebufferTexture2D(l.FRAMEBUFFER,c,s,a,0);else if(t.depthTexture.format===1027)Fe(t)?g.framebufferTexture2DMultisampleEXT(l.FRAMEBUFFER,c,s,a,0,o):l.framebufferTexture2D(l.FRAMEBUFFER,c,s,a,0);else throw Error(`THREE.WebGLTextures: Unknown depthTexture format.`)}function De(e){let t=f.get(e),n=e.isWebGLCubeRenderTarget===!0;if(t.__boundDepthTexture!==e.depthTexture){let n=e.depthTexture;if(t.__depthDisposeCallback&&t.__depthDisposeCallback(),n){let e=()=>{delete t.__boundDepthTexture,delete t.__depthDisposeCallback,n.removeEventListener(`dispose`,e)};n.addEventListener(`dispose`,e),t.__depthDisposeCallback=e}t.__boundDepthTexture=n}if(e.depthTexture&&!t.__autoAllocateDepthBuffer){if(n)for(let n=0;n<6;n++)Ee(t.__webglFramebuffer[n],e,n);else{let n=e.texture.mipmaps;n&&n.length>0?Ee(t.__webglFramebuffer[0],e,0):Ee(t.__webglFramebuffer,e,0)}}else if(n){t.__webglDepthbuffer=[];for(let n=0;n<6;n++)if(d.bindFramebuffer(l.FRAMEBUFFER,t.__webglFramebuffer[n]),t.__webglDepthbuffer[n]===void 0)t.__webglDepthbuffer[n]=l.createRenderbuffer(),Te(t.__webglDepthbuffer[n],e,!1);else{let r=e.stencilBuffer?l.DEPTH_STENCIL_ATTACHMENT:l.DEPTH_ATTACHMENT,i=t.__webglDepthbuffer[n];l.bindRenderbuffer(l.RENDERBUFFER,i),l.framebufferRenderbuffer(l.FRAMEBUFFER,r,l.RENDERBUFFER,i)}}else{let n=e.texture.mipmaps;if(n&&n.length>0?d.bindFramebuffer(l.FRAMEBUFFER,t.__webglFramebuffer[0]):d.bindFramebuffer(l.FRAMEBUFFER,t.__webglFramebuffer),t.__webglDepthbuffer===void 0)t.__webglDepthbuffer=l.createRenderbuffer(),Te(t.__webglDepthbuffer,e,!1);else{let n=e.stencilBuffer?l.DEPTH_STENCIL_ATTACHMENT:l.DEPTH_ATTACHMENT,r=t.__webglDepthbuffer;l.bindRenderbuffer(l.RENDERBUFFER,r),l.framebufferRenderbuffer(l.FRAMEBUFFER,n,l.RENDERBUFFER,r)}}d.bindFramebuffer(l.FRAMEBUFFER,null)}function Oe(e,t,n){let r=f.get(e);t!==void 0&&we(r.__webglFramebuffer,e,e.texture,l.COLOR_ATTACHMENT0,l.TEXTURE_2D,0),n!==void 0&&De(e)}function ke(e){let t=e.texture,n=f.get(e),r=f.get(t);e.addEventListener(`dispose`,N);let i=e.textures,a=e.isWebGLCubeRenderTarget===!0,o=i.length>1;if(o||(r.__webglTexture===void 0&&(r.__webglTexture=l.createTexture()),r.__version=t.version,h.memory.textures++),a){n.__webglFramebuffer=[];for(let e=0;e<6;e++)if(t.mipmaps&&t.mipmaps.length>0){n.__webglFramebuffer[e]=[];for(let r=0;r<t.mipmaps.length;r++)n.__webglFramebuffer[e][r]=l.createFramebuffer()}else n.__webglFramebuffer[e]=l.createFramebuffer()}else{if(t.mipmaps&&t.mipmaps.length>0){n.__webglFramebuffer=[];for(let e=0;e<t.mipmaps.length;e++)n.__webglFramebuffer[e]=l.createFramebuffer()}else n.__webglFramebuffer=l.createFramebuffer();if(o)for(let e=0,t=i.length;e<t;e++){let t=f.get(i[e]);t.__webglTexture===void 0&&(t.__webglTexture=l.createTexture(),h.memory.textures++)}if(e.samples>0&&Fe(e)===!1){n.__webglMultisampledFramebuffer=l.createFramebuffer(),n.__webglColorRenderbuffer=[],d.bindFramebuffer(l.FRAMEBUFFER,n.__webglMultisampledFramebuffer);for(let t=0;t<i.length;t++){let r=i[t];n.__webglColorRenderbuffer[t]=l.createRenderbuffer(),l.bindRenderbuffer(l.RENDERBUFFER,n.__webglColorRenderbuffer[t]);let a=m.convert(r.format,r.colorSpace),o=m.convert(r.type),s=A(r.internalFormat,a,o,r.normalized,r.colorSpace,e.isXRRenderTarget===!0),c=Pe(e);l.renderbufferStorageMultisample(l.RENDERBUFFER,c,s,e.width,e.height),l.framebufferRenderbuffer(l.FRAMEBUFFER,l.COLOR_ATTACHMENT0+t,l.RENDERBUFFER,n.__webglColorRenderbuffer[t])}l.bindRenderbuffer(l.RENDERBUFFER,null),e.depthBuffer&&(n.__webglDepthRenderbuffer=l.createRenderbuffer(),Te(n.__webglDepthRenderbuffer,e,!0)),d.bindFramebuffer(l.FRAMEBUFFER,null)}}if(a){d.bindTexture(l.TEXTURE_CUBE_MAP,r.__webglTexture),ye(l.TEXTURE_CUBE_MAP,t);for(let r=0;r<6;r++)if(t.mipmaps&&t.mipmaps.length>0)for(let i=0;i<t.mipmaps.length;i++)we(n.__webglFramebuffer[r][i],e,t,l.COLOR_ATTACHMENT0,l.TEXTURE_CUBE_MAP_POSITIVE_X+r,i);else we(n.__webglFramebuffer[r],e,t,l.COLOR_ATTACHMENT0,l.TEXTURE_CUBE_MAP_POSITIVE_X+r,0);D(t)&&O(l.TEXTURE_CUBE_MAP),d.unbindTexture()}else if(o){for(let t=0,r=i.length;t<r;t++){let r=i[t],a=f.get(r),o=l.TEXTURE_2D;(e.isWebGL3DRenderTarget||e.isWebGLArrayRenderTarget)&&(o=e.isWebGL3DRenderTarget?l.TEXTURE_3D:l.TEXTURE_2D_ARRAY),d.bindTexture(o,a.__webglTexture),ye(o,r),we(n.__webglFramebuffer,e,r,l.COLOR_ATTACHMENT0+t,o,0),D(r)&&O(o)}d.unbindTexture()}else{let i=l.TEXTURE_2D;if((e.isWebGL3DRenderTarget||e.isWebGLArrayRenderTarget)&&(i=e.isWebGL3DRenderTarget?l.TEXTURE_3D:l.TEXTURE_2D_ARRAY),d.bindTexture(i,r.__webglTexture),ye(i,t),t.mipmaps&&t.mipmaps.length>0)for(let r=0;r<t.mipmaps.length;r++)we(n.__webglFramebuffer[r],e,t,l.COLOR_ATTACHMENT0,i,r);else we(n.__webglFramebuffer,e,t,l.COLOR_ATTACHMENT0,i,0);D(t)&&O(i),d.unbindTexture()}e.depthBuffer&&De(e)}function Ae(e){let t=e.textures;for(let n=0,r=t.length;n<r;n++){let r=t[n];if(D(r)){let t=k(e),n=f.get(r).__webglTexture;d.bindTexture(t,n),O(t),d.unbindTexture()}}}let je=[],Me=[];function Ne(e){if(e.samples>0){if(Fe(e)===!1){let t=e.textures,n=e.width,r=e.height,i=l.COLOR_BUFFER_BIT,a=e.stencilBuffer?l.DEPTH_STENCIL_ATTACHMENT:l.DEPTH_ATTACHMENT,o=f.get(e),s=t.length>1;if(s)for(let e=0;e<t.length;e++)d.bindFramebuffer(l.FRAMEBUFFER,o.__webglMultisampledFramebuffer),l.framebufferRenderbuffer(l.FRAMEBUFFER,l.COLOR_ATTACHMENT0+e,l.RENDERBUFFER,null),d.bindFramebuffer(l.FRAMEBUFFER,o.__webglFramebuffer),l.framebufferTexture2D(l.DRAW_FRAMEBUFFER,l.COLOR_ATTACHMENT0+e,l.TEXTURE_2D,null,0);d.bindFramebuffer(l.READ_FRAMEBUFFER,o.__webglMultisampledFramebuffer);let c=e.texture.mipmaps;c&&c.length>0?d.bindFramebuffer(l.DRAW_FRAMEBUFFER,o.__webglFramebuffer[0]):d.bindFramebuffer(l.DRAW_FRAMEBUFFER,o.__webglFramebuffer);for(let c=0;c<t.length;c++){if(e.resolveDepthBuffer&&(e.depthBuffer&&(i|=l.DEPTH_BUFFER_BIT),e.stencilBuffer&&e.resolveStencilBuffer&&(i|=l.STENCIL_BUFFER_BIT)),s){l.framebufferRenderbuffer(l.READ_FRAMEBUFFER,l.COLOR_ATTACHMENT0,l.RENDERBUFFER,o.__webglColorRenderbuffer[c]);let e=f.get(t[c]).__webglTexture;l.framebufferTexture2D(l.DRAW_FRAMEBUFFER,l.COLOR_ATTACHMENT0,l.TEXTURE_2D,e,0)}l.blitFramebuffer(0,0,n,r,0,0,n,r,i,l.NEAREST),_===!0&&(je.length=0,Me.length=0,je.push(l.COLOR_ATTACHMENT0+c),e.depthBuffer&&e.storeMultisampledDepthBuffer===!1&&(je.push(a),Me.push(a),l.invalidateFramebuffer(l.DRAW_FRAMEBUFFER,Me)),l.invalidateFramebuffer(l.READ_FRAMEBUFFER,je))}if(d.bindFramebuffer(l.READ_FRAMEBUFFER,null),d.bindFramebuffer(l.DRAW_FRAMEBUFFER,null),s)for(let e=0;e<t.length;e++){d.bindFramebuffer(l.FRAMEBUFFER,o.__webglMultisampledFramebuffer),l.framebufferRenderbuffer(l.FRAMEBUFFER,l.COLOR_ATTACHMENT0+e,l.RENDERBUFFER,o.__webglColorRenderbuffer[e]);let n=f.get(t[e]).__webglTexture;d.bindFramebuffer(l.FRAMEBUFFER,o.__webglFramebuffer),l.framebufferTexture2D(l.DRAW_FRAMEBUFFER,l.COLOR_ATTACHMENT0+e,l.TEXTURE_2D,n,0)}d.bindFramebuffer(l.DRAW_FRAMEBUFFER,o.__webglMultisampledFramebuffer)}else if(e.depthBuffer&&e.storeMultisampledDepthBuffer===!1&&_){let t=e.stencilBuffer?l.DEPTH_STENCIL_ATTACHMENT:l.DEPTH_ATTACHMENT;l.invalidateFramebuffer(l.DRAW_FRAMEBUFFER,[t])}}}function Pe(e){return Math.min(p.maxSamples,e.samples)}function Fe(e){let t=f.get(e);return e.samples>0&&u.has(`WEBGL_multisampled_render_to_texture`)===!0&&t.__useRenderToTexture!==!1}function Ie(e){let t=h.render.frame;b.get(e)!==t&&(b.set(e,t),e.update())}function Le(e,t){let n=e.colorSpace,r=e.format,i=e.type;return e.isCompressedTexture===!0||e.isVideoTexture===!0||n!==`srgb-linear`&&n!==``&&(Xe.getTransfer(n)===`srgb`?(r!==1023||i!==1009)&&F(`WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType.`):me(`WebGLTextures: Unsupported texture color space:`,n)),t}function Re(e){return typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement?(v.width=e.naturalWidth||e.width,v.height=e.naturalHeight||e.height):typeof VideoFrame<`u`&&e instanceof VideoFrame?(v.width=e.displayWidth,v.height=e.displayHeight):(v.width=e.width,v.height=e.height),v}this.allocateTextureUnit=ce,this.resetTextureUnits=ae,this.getTextureUnits=oe,this.setTextureUnits=se,this.setTexture2D=de,this.setTexture2DArray=fe,this.setTexture3D=pe,this.setTextureCube=he,this.rebindTextures=Oe,this.setupRenderTarget=ke,this.updateRenderTargetMipmap=Ae,this.updateMultisampleRenderTarget=Ne,this.setupDepthRenderbuffer=De,this.setupFrameBufferTexture=we,this.useMultisampledRTT=Fe,this.isReversedDepthBuffer=function(){return d.buffers.depth.getReversed()}}function td(e,t){function n(n,r=``){let i,a=Xe.getTransfer(r);if(n===1009)return e.UNSIGNED_BYTE;if(n===1017)return e.UNSIGNED_SHORT_4_4_4_4;if(n===1018)return e.UNSIGNED_SHORT_5_5_5_1;if(n===35902)return e.UNSIGNED_INT_5_9_9_9_REV;if(n===35899)return e.UNSIGNED_INT_10F_11F_11F_REV;if(n===1010)return e.BYTE;if(n===1011)return e.SHORT;if(n===1012)return e.UNSIGNED_SHORT;if(n===1013)return e.INT;if(n===1014)return e.UNSIGNED_INT;if(n===1015)return e.FLOAT;if(n===1016)return e.HALF_FLOAT;if(n===1021)return e.ALPHA;if(n===1022)return e.RGB;if(n===1023)return e.RGBA;if(n===1026)return e.DEPTH_COMPONENT;if(n===1027)return e.DEPTH_STENCIL;if(n===1028)return e.RED;if(n===1029)return e.RED_INTEGER;if(n===1030)return e.RG;if(n===1031)return e.RG_INTEGER;if(n===1033)return e.RGBA_INTEGER;if(n===33776||n===33777||n===33778||n===33779){if(a===`srgb`){if(i=t.get(`WEBGL_compressed_texture_s3tc_srgb`),i!==null){if(n===33776)return i.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===33777)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===33778)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===33779)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null}else if(i=t.get(`WEBGL_compressed_texture_s3tc`),i!==null){if(n===33776)return i.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===33777)return i.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===33778)return i.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===33779)return i.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null}if(n===35840||n===35841||n===35842||n===35843){if(i=t.get(`WEBGL_compressed_texture_pvrtc`),i!==null){if(n===35840)return i.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===35841)return i.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===35842)return i.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===35843)return i.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null}if(n===36196||n===37492||n===37496||n===37488||n===37489||n===37490||n===37491){if(i=t.get(`WEBGL_compressed_texture_etc`),i!==null){if(n===36196||n===37492)return a===`srgb`?i.COMPRESSED_SRGB8_ETC2:i.COMPRESSED_RGB8_ETC2;if(n===37496)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:i.COMPRESSED_RGBA8_ETC2_EAC;if(n===37488)return i.COMPRESSED_R11_EAC;if(n===37489)return i.COMPRESSED_SIGNED_R11_EAC;if(n===37490)return i.COMPRESSED_RG11_EAC;if(n===37491)return i.COMPRESSED_SIGNED_RG11_EAC}else return null}if(n===37808||n===37809||n===37810||n===37811||n===37812||n===37813||n===37814||n===37815||n===37816||n===37817||n===37818||n===37819||n===37820||n===37821){if(i=t.get(`WEBGL_compressed_texture_astc`),i!==null){if(n===37808)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:i.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===37809)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:i.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===37810)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:i.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===37811)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:i.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===37812)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:i.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===37813)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:i.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===37814)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:i.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===37815)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:i.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===37816)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:i.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===37817)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:i.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===37818)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:i.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===37819)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:i.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===37820)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:i.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===37821)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:i.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null}if(n===36492||n===36494||n===36495){if(i=t.get(`EXT_texture_compression_bptc`),i!==null){if(n===36492)return a===`srgb`?i.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:i.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===36494)return i.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===36495)return i.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null}if(n===36283||n===36284||n===36285||n===36286){if(i=t.get(`EXT_texture_compression_rgtc`),i!==null){if(n===36283)return i.COMPRESSED_RED_RGTC1_EXT;if(n===36284)return i.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===36285)return i.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===36286)return i.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null}return n===1020?e.UNSIGNED_INT_24_8:e[n]===void 0?null:e[n]}return{convert:n}}var nd=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,rd=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`,id=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){let n=new gi(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){let t=e.cameras[0].viewport,n=new oo({vertexShader:nd,fragmentShader:rd,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new G(new Wa(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},ad=class extends ve{constructor(e,t){super();let n=this,r=null,i=1,a=null,o=`local-floor`,s=1,c=null,u=null,f=null,p=null,m=null,h=null,b=typeof XRWebGLBinding<`u`,x=new id,S={},C=t.getContextAttributes(),w=null,T=null,E=[],D=[],O=new z,k=null,A=null,j=new us;j.viewport=new st;let M=new us;M.viewport=new st;let ee=[j,M],N=new Ts,te=null,ne=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(e){let t=E[e];return t===void 0&&(t=new Vt,E[e]=t),t.getTargetRaySpace()},this.getControllerGrip=function(e){let t=E[e];return t===void 0&&(t=new Vt,E[e]=t),t.getGripSpace()},this.getHand=function(e){let t=E[e];return t===void 0&&(t=new Vt,E[e]=t),t.getHandSpace()};function P(e){let t=D.indexOf(e.inputSource);if(t===-1)return;let n=E[t];n!==void 0&&(n.update(e.inputSource,e.frame,c||a),n.dispatchEvent({type:e.type,data:e.inputSource}))}function re(){r.removeEventListener(`select`,P),r.removeEventListener(`selectstart`,P),r.removeEventListener(`selectend`,P),r.removeEventListener(`squeeze`,P),r.removeEventListener(`squeezestart`,P),r.removeEventListener(`squeezeend`,P),r.removeEventListener(`end`,re),r.removeEventListener(`inputsourceschange`,ie);for(let e=0;e<E.length;e++){let t=D[e];t!==null&&(D[e]=null,E[e].disconnect(t))}te=null,ne=null,x.reset();for(let e in S)delete S[e];if(e.setRenderTarget(w),m=null,p=null,f=null,r=null,T=null,fe.stop(),n.isPresenting=!1,e.setPixelRatio(k),e.setSize(O.width,O.height,!1),A!==null){let e=A.camera;e.fov=A.fov,e.zoom=A.zoom,e.updateProjectionMatrix(),A=null}n.dispatchEvent({type:`sessionend`})}this.setFramebufferScaleFactor=function(e){i=e,n.isPresenting===!0&&F(`WebXRManager: Cannot change framebuffer scale while presenting.`)},this.setReferenceSpaceType=function(e){o=e,n.isPresenting===!0&&F(`WebXRManager: Cannot change reference space type while presenting.`)},this.getReferenceSpace=function(){return c||a},this.setReferenceSpace=function(e){c=e},this.getBaseLayer=function(){return p===null?m:p},this.getBinding=function(){return f===null&&b&&(f=new XRWebGLBinding(r,t)),f},this.getFrame=function(){return h},this.getSession=function(){return r},this.setSession=async function(u){if(r=u,r!==null){if(w=e.getRenderTarget(),r.addEventListener(`select`,P),r.addEventListener(`selectstart`,P),r.addEventListener(`selectend`,P),r.addEventListener(`squeeze`,P),r.addEventListener(`squeezestart`,P),r.addEventListener(`squeezeend`,P),r.addEventListener(`end`,re),r.addEventListener(`inputsourceschange`,ie),C.xrCompatible!==!0&&await t.makeXRCompatible(),k=e.getPixelRatio(),e.getSize(O),b&&`createProjectionLayer`in XRWebGLBinding.prototype){let n=null,a=null,o=null;C.depth&&(o=C.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,n=C.stencil?y:v,a=C.stencil?g:d);let s={colorFormat:t.RGBA8,depthFormat:o,scaleFactor:i};f=this.getBinding(),p=f.createProjectionLayer(s),r.updateRenderState({layers:[p]}),e.setPixelRatio(1),e.setSize(p.textureWidth,p.textureHeight,!1),T=new lt(p.textureWidth,p.textureHeight,{format:_,type:l,depthTexture:new mi(p.textureWidth,p.textureHeight,a,void 0,void 0,void 0,void 0,void 0,void 0,n),stencilBuffer:C.stencil,colorSpace:e.outputColorSpace,samples:C.antialias?4:0,resolveDepthBuffer:p.ignoreDepthValues===!1,resolveStencilBuffer:p.ignoreDepthValues===!1,storeMultisampledDepthBuffer:p.ignoreDepthValues===!1,storeMultisampledStencilBuffer:p.ignoreDepthValues===!1})}else{let n={antialias:C.antialias,alpha:!0,depth:C.depth,stencil:C.stencil,framebufferScaleFactor:i};m=new XRWebGLLayer(r,t,n),r.updateRenderState({baseLayer:m}),e.setPixelRatio(1),e.setSize(m.framebufferWidth,m.framebufferHeight,!1),T=new lt(m.framebufferWidth,m.framebufferHeight,{format:_,type:l,colorSpace:e.outputColorSpace,stencilBuffer:C.stencil,resolveDepthBuffer:m.ignoreDepthValues===!1,resolveStencilBuffer:m.ignoreDepthValues===!1,storeMultisampledDepthBuffer:m.ignoreDepthValues===!1,storeMultisampledStencilBuffer:m.ignoreDepthValues===!1})}T.isXRRenderTarget=!0,this.setFoveation(s),c=null,a=await r.requestReferenceSpace(o),fe.setContext(r),fe.start(),n.isPresenting=!0,n.dispatchEvent({type:`sessionstart`})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode},this.getDepthTexture=function(){return x.getDepthTexture()};function ie(e){for(let t=0;t<e.removed.length;t++){let n=e.removed[t],r=D.indexOf(n);r>=0&&(D[r]=null,E[r].disconnect(n))}for(let t=0;t<e.added.length;t++){let n=e.added[t],r=D.indexOf(n);if(r===-1){for(let e=0;e<E.length;e++)if(e>=D.length){D.push(n),r=e;break}else if(D[e]===null){D[e]=n,r=e;break}if(r===-1)break}let i=E[r];i&&i.connect(n)}}let ae=new V,oe=new V;function se(e,t,n){ae.setFromMatrixPosition(t.matrixWorld),oe.setFromMatrixPosition(n.matrixWorld);let r=ae.distanceTo(oe),i=t.projectionMatrix.elements,a=n.projectionMatrix.elements,o=i[14]/(i[10]-1),s=i[14]/(i[10]+1),c=(i[9]+1)/i[5],l=(i[9]-1)/i[5],u=(i[8]-1)/i[0],d=(a[8]+1)/a[0],f=o*u,p=o*d,m=r/(-u+d),h=m*-u;if(t.matrixWorld.decompose(e.position,e.quaternion,e.scale),e.translateX(h),e.translateZ(m),e.matrixWorld.compose(e.position,e.quaternion,e.scale),e.matrixWorldInverse.copy(e.matrixWorld).invert(),i[10]===-1)e.projectionMatrix.copy(t.projectionMatrix),e.projectionMatrixInverse.copy(t.projectionMatrixInverse);else{let t=o+m,n=s+m,i=f-h,a=p+(r-h),u=c*s/n*t,d=l*s/n*t;e.projectionMatrix.makePerspective(i,a,u,d,t,n),e.projectionMatrixInverse.copy(e.projectionMatrix).invert()}}function ce(e,t){t===null?e.matrixWorld.copy(e.matrix):e.matrixWorld.multiplyMatrices(t.matrixWorld,e.matrix),e.matrixWorldInverse.copy(e.matrixWorld).invert()}this.updateCamera=function(e){if(r===null)return;let t=e.near,n=e.far;x.texture!==null&&(x.depthNear>0&&(t=x.depthNear),x.depthFar>0&&(n=x.depthFar)),N.near=M.near=j.near=t,N.far=M.far=j.far=n,(te!==N.near||ne!==N.far)&&(r.updateRenderState({depthNear:N.near,depthFar:N.far}),te=N.near,ne=N.far),N.layers.mask=e.layers.mask|6,j.layers.mask=N.layers.mask&-5,M.layers.mask=N.layers.mask&-3;let i=e.parent,a=N.cameras;ce(N,i);for(let e=0;e<a.length;e++)ce(a[e],i);a.length===2?se(N,j,M):N.projectionMatrix.copy(j.projectionMatrix),A===null&&e.isPerspectiveCamera&&(A={camera:e,fov:e.fov,zoom:e.zoom}),le(e,N,i)};function le(e,t,n){n===null?e.matrix.copy(t.matrixWorld):(e.matrix.copy(n.matrixWorld),e.matrix.invert(),e.matrix.multiply(t.matrixWorld)),e.matrix.decompose(e.position,e.quaternion,e.scale),e.updateMatrixWorld(!0),e.projectionMatrix.copy(t.projectionMatrix),e.projectionMatrixInverse.copy(t.projectionMatrixInverse),e.isPerspectiveCamera&&(e.fov=Se*2*Math.atan(1/e.projectionMatrix.elements[5]),e.zoom=1)}this.getCamera=function(){return N},this.getFoveation=function(){if(p!==null||m!==null)return s},this.setFoveation=function(e){s=e,p!==null&&(p.fixedFoveation=e),m!==null&&m.fixedFoveation!==void 0&&(m.fixedFoveation=e)},this.hasDepthSensing=function(){return x.texture!==null},this.getDepthSensingMesh=function(){return x.getMesh(N)},this.getCameraTexture=function(e){return S[e]};let ue=null;function de(t,i){if(u=i.getViewerPose(c||a),h=i,u!==null){let t=u.views;m!==null&&(e.setRenderTargetFramebuffer(T,m.framebuffer),e.setRenderTarget(T));let i=!1;t.length!==N.cameras.length&&(N.cameras.length=0,i=!0);for(let n=0;n<t.length;n++){let r=t[n],a=null;if(m!==null)a=m.getViewport(r);else{let t=f.getViewSubImage(p,r);a=t.viewport,n===0&&(e.setRenderTargetTextures(T,t.colorTexture,t.depthStencilTexture),e.setRenderTarget(T))}let o=ee[n];o===void 0&&(o=new us,o.layers.enable(n),o.viewport=new st,ee[n]=o),o.matrix.fromArray(r.transform.matrix),o.matrix.decompose(o.position,o.quaternion,o.scale),o.projectionMatrix.fromArray(r.projectionMatrix),o.projectionMatrixInverse.copy(o.projectionMatrix).invert(),o.viewport.set(a.x,a.y,a.width,a.height),n===0&&(N.matrix.copy(o.matrix),N.matrix.decompose(N.position,N.quaternion,N.scale)),i===!0&&N.cameras.push(o)}let a=r.enabledFeatures;if(a&&a.includes(`depth-sensing`)&&r.depthUsage==`gpu-optimized`&&b){f=n.getBinding();let e=f.getDepthInformation(t[0]);e&&e.isValid&&e.texture&&x.init(e,r.renderState)}if(a&&a.includes(`camera-access`)&&b){e.state.unbindTexture(),f=n.getBinding();for(let e=0;e<t.length;e++){let n=t[e].camera;if(n){let e=S[n];e||(e=new gi,S[n]=e);let t=f.getCameraImage(n);e.sourceTexture=t}}}}for(let e=0;e<E.length;e++){let t=D[e],n=E[e];t!==null&&n!==void 0&&n.update(t,i,c||a)}ue&&ue(t,i),i.detectedPlanes&&n.dispatchEvent({type:`planesdetected`,data:i}),h=null}let fe=new Xs;fe.setAnimationLoop(de),this.setAnimationLoop=function(e){ue=e},this.dispose=function(){}}},od=new ft,sd=new Ge;sd.set(-1,0,0,0,1,0,0,0,1);function cd(e,t){function n(e,t){e.matrixAutoUpdate===!0&&e.updateMatrix(),t.value.copy(e.matrix)}function r(t,n){n.color.getRGB(t.fogColor.value,no(e)),n.isFog?(t.fogNear.value=n.near,t.fogFar.value=n.far):n.isFogExp2&&(t.fogDensity.value=n.density)}function i(e,t,n,r,i){t.isNodeMaterial?t.uniformsNeedUpdate=!1:t.isMeshBasicMaterial?a(e,t):t.isMeshLambertMaterial?(a(e,t),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)):t.isMeshToonMaterial?(a(e,t),d(e,t)):t.isMeshPhongMaterial?(a(e,t),u(e,t),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)):t.isMeshStandardMaterial?(a(e,t),f(e,t),t.isMeshPhysicalMaterial&&p(e,t,i)):t.isMeshMatcapMaterial?(a(e,t),m(e,t)):t.isMeshDepthMaterial?a(e,t):t.isMeshDistanceMaterial?(a(e,t),h(e,t)):t.isMeshNormalMaterial?a(e,t):t.isLineBasicMaterial?(o(e,t),t.isLineDashedMaterial&&s(e,t)):t.isPointsMaterial?c(e,t,n,r):t.isSpriteMaterial?l(e,t):t.isShadowMaterial?(e.color.value.copy(t.color),e.opacity.value=t.opacity):t.isShaderMaterial&&(t.uniformsNeedUpdate=!1)}function a(e,r){e.opacity.value=r.opacity,r.color&&e.diffuse.value.copy(r.color),r.emissive&&e.emissive.value.copy(r.emissive).multiplyScalar(r.emissiveIntensity),r.map&&(e.map.value=r.map,n(r.map,e.mapTransform)),r.alphaMap&&(e.alphaMap.value=r.alphaMap,n(r.alphaMap,e.alphaMapTransform)),r.bumpMap&&(e.bumpMap.value=r.bumpMap,n(r.bumpMap,e.bumpMapTransform),e.bumpScale.value=r.bumpScale,r.side===1&&(e.bumpScale.value*=-1)),r.normalMap&&(e.normalMap.value=r.normalMap,n(r.normalMap,e.normalMapTransform),e.normalScale.value.copy(r.normalScale),r.side===1&&e.normalScale.value.negate()),r.displacementMap&&(e.displacementMap.value=r.displacementMap,n(r.displacementMap,e.displacementMapTransform),e.displacementScale.value=r.displacementScale,e.displacementBias.value=r.displacementBias),r.emissiveMap&&(e.emissiveMap.value=r.emissiveMap,n(r.emissiveMap,e.emissiveMapTransform)),r.specularMap&&(e.specularMap.value=r.specularMap,n(r.specularMap,e.specularMapTransform)),r.alphaTest>0&&(e.alphaTest.value=r.alphaTest);let i=t.get(r),a=i.envMap,o=i.envMapRotation;a&&(e.envMap.value=a,e.envMapRotation.value.setFromMatrix4(od.makeRotationFromEuler(o)).transpose(),a.isCubeTexture&&a.isRenderTargetTexture===!1&&e.envMapRotation.value.premultiply(sd),e.reflectivity.value=r.reflectivity,e.ior.value=r.ior,e.refractionRatio.value=r.refractionRatio),r.lightMap&&(e.lightMap.value=r.lightMap,e.lightMapIntensity.value=r.lightMapIntensity,n(r.lightMap,e.lightMapTransform)),r.aoMap&&(e.aoMap.value=r.aoMap,e.aoMapIntensity.value=r.aoMapIntensity,n(r.aoMap,e.aoMapTransform))}function o(e,t){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,t.map&&(e.map.value=t.map,n(t.map,e.mapTransform))}function s(e,t){e.dashSize.value=t.dashSize,e.totalSize.value=t.dashSize+t.gapSize,e.scale.value=t.scale}function c(e,t,r,i){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,e.size.value=t.size*r,e.scale.value=i*.5,t.map&&(e.map.value=t.map,n(t.map,e.uvTransform)),t.alphaMap&&(e.alphaMap.value=t.alphaMap,n(t.alphaMap,e.alphaMapTransform)),t.alphaTest>0&&(e.alphaTest.value=t.alphaTest)}function l(e,t){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,e.rotation.value=t.rotation,t.map&&(e.map.value=t.map,n(t.map,e.mapTransform)),t.alphaMap&&(e.alphaMap.value=t.alphaMap,n(t.alphaMap,e.alphaMapTransform)),t.alphaTest>0&&(e.alphaTest.value=t.alphaTest)}function u(e,t){e.specular.value.copy(t.specular),e.shininess.value=Math.max(t.shininess,1e-4)}function d(e,t){t.gradientMap&&(e.gradientMap.value=t.gradientMap)}function f(e,t){e.metalness.value=t.metalness,t.metalnessMap&&(e.metalnessMap.value=t.metalnessMap,n(t.metalnessMap,e.metalnessMapTransform)),e.roughness.value=t.roughness,t.roughnessMap&&(e.roughnessMap.value=t.roughnessMap,n(t.roughnessMap,e.roughnessMapTransform)),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)}function p(e,t,r){e.ior.value=t.ior,t.sheen>0&&(e.sheenColor.value.copy(t.sheenColor).multiplyScalar(t.sheen),e.sheenRoughness.value=t.sheenRoughness,t.sheenColorMap&&(e.sheenColorMap.value=t.sheenColorMap,n(t.sheenColorMap,e.sheenColorMapTransform)),t.sheenRoughnessMap&&(e.sheenRoughnessMap.value=t.sheenRoughnessMap,n(t.sheenRoughnessMap,e.sheenRoughnessMapTransform))),t.clearcoat>0&&(e.clearcoat.value=t.clearcoat,e.clearcoatRoughness.value=t.clearcoatRoughness,t.clearcoatMap&&(e.clearcoatMap.value=t.clearcoatMap,n(t.clearcoatMap,e.clearcoatMapTransform)),t.clearcoatRoughnessMap&&(e.clearcoatRoughnessMap.value=t.clearcoatRoughnessMap,n(t.clearcoatRoughnessMap,e.clearcoatRoughnessMapTransform)),t.clearcoatNormalMap&&(e.clearcoatNormalMap.value=t.clearcoatNormalMap,n(t.clearcoatNormalMap,e.clearcoatNormalMapTransform),e.clearcoatNormalScale.value.copy(t.clearcoatNormalScale),t.side===1&&e.clearcoatNormalScale.value.negate())),t.dispersion>0&&(e.dispersion.value=t.dispersion),t.retroreflectivity>0&&(e.retroreflectivity.value=t.retroreflectivity),t.iridescence>0&&(e.iridescence.value=t.iridescence,e.iridescenceIOR.value=t.iridescenceIOR,e.iridescenceThicknessMinimum.value=t.iridescenceThicknessRange[0],e.iridescenceThicknessMaximum.value=t.iridescenceThicknessRange[1],t.iridescenceMap&&(e.iridescenceMap.value=t.iridescenceMap,n(t.iridescenceMap,e.iridescenceMapTransform)),t.iridescenceThicknessMap&&(e.iridescenceThicknessMap.value=t.iridescenceThicknessMap,n(t.iridescenceThicknessMap,e.iridescenceThicknessMapTransform))),t.transmission>0&&(e.transmission.value=t.transmission,e.transmissionSamplerMap.value=r.texture,e.transmissionSamplerSize.value.set(r.width,r.height),t.transmissionMap&&(e.transmissionMap.value=t.transmissionMap,n(t.transmissionMap,e.transmissionMapTransform)),e.thickness.value=t.thickness,t.thicknessMap&&(e.thicknessMap.value=t.thicknessMap,n(t.thicknessMap,e.thicknessMapTransform)),e.attenuationDistance.value=t.attenuationDistance,e.attenuationColor.value.copy(t.attenuationColor)),t.anisotropy>0&&(e.anisotropyVector.value.set(t.anisotropy*Math.cos(t.anisotropyRotation),t.anisotropy*Math.sin(t.anisotropyRotation)),t.anisotropyMap&&(e.anisotropyMap.value=t.anisotropyMap,n(t.anisotropyMap,e.anisotropyMapTransform))),e.specularIntensity.value=t.specularIntensity,e.specularColor.value.copy(t.specularColor),t.specularColorMap&&(e.specularColorMap.value=t.specularColorMap,n(t.specularColorMap,e.specularColorMapTransform)),t.specularIntensityMap&&(e.specularIntensityMap.value=t.specularIntensityMap,n(t.specularIntensityMap,e.specularIntensityMapTransform))}function m(e,t){t.matcap&&(e.matcap.value=t.matcap)}function h(e,n){let r=t.get(n).light;e.referencePosition.value.setFromMatrixPosition(r.matrixWorld),e.nearDistance.value=r.shadow.camera.near,e.farDistance.value=r.shadow.camera.far}return{refreshFogUniforms:r,refreshMaterialUniforms:i}}function ld(e,t,n,r){let i={},a={},o=[],s=e.getParameter(e.MAX_UNIFORM_BUFFER_BINDINGS);function c(e,t){let n=t.program;r.uniformBlockBinding(e,n)}function l(e,n){let o=i[e.id];o===void 0&&(g(e),o=u(e),i[e.id]=o,e.addEventListener(`dispose`,v));let s=n.program;r.updateUBOMapping(e,s);let c=t.render.frame;a[e.id]!==c&&(f(e),a[e.id]=c)}function u(t){let n=d();t.__bindingPointIndex=n;let r=e.createBuffer(),i=t.__size,a=t.usage;return e.bindBuffer(e.UNIFORM_BUFFER,r),e.bufferData(e.UNIFORM_BUFFER,i,a),e.bindBuffer(e.UNIFORM_BUFFER,null),e.bindBufferBase(e.UNIFORM_BUFFER,n,r),r}function d(){for(let e=0;e<s;e++)if(o.indexOf(e)===-1)return o.push(e),e;return me(`WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached.`),0}function f(t){let n=i[t.id],r=t.uniforms,a=t.__cache;e.bindBuffer(e.UNIFORM_BUFFER,n);for(let e=0,t=r.length;e<t;e++){let t=r[e];if(Array.isArray(t))for(let n=0,r=t.length;n<r;n++)p(t[n],e,n,a);else p(t,e,0,a)}e.bindBuffer(e.UNIFORM_BUFFER,null)}function p(t,n,r,i){if(h(t,n,r,i)===!0){let n=t.__offset,r=t.value;if(Array.isArray(r)){let e=0;for(let n=0;n<r.length;n++){let i=r[n],a=_(i);m(i,t.__data,e),typeof i!=`number`&&typeof i!=`boolean`&&!i.isMatrix3&&!ArrayBuffer.isView(i)&&(e+=a.storage/Float32Array.BYTES_PER_ELEMENT)}}else m(r,t.__data,0);e.bufferSubData(e.UNIFORM_BUFFER,n,t.__data)}}function m(e,t,n){typeof e==`number`||typeof e==`boolean`?t[0]=e:e.isMatrix3?(t[0]=e.elements[0],t[1]=e.elements[1],t[2]=e.elements[2],t[3]=0,t[4]=e.elements[3],t[5]=e.elements[4],t[6]=e.elements[5],t[7]=0,t[8]=e.elements[6],t[9]=e.elements[7],t[10]=e.elements[8],t[11]=0):ArrayBuffer.isView(e)?t.set(new e.constructor(e.buffer,e.byteOffset,t.length)):e.toArray(t,n)}function h(e,t,n,r){let i=e.value,a=t+`_`+n;if(r[a]===void 0)return r[a]=typeof i==`number`||typeof i==`boolean`?i:ArrayBuffer.isView(i)?i.slice():i.clone(),!0;{let e=r[a];if(typeof i==`number`||typeof i==`boolean`){if(e!==i)return r[a]=i,!0}else if(ArrayBuffer.isView(i))return!0;else if(e.equals(i)===!1)return e.copy(i),!0}return!1}function g(e){let t=e.uniforms,n=0;for(let e=0,r=t.length;e<r;e++){let r=Array.isArray(t[e])?t[e]:[t[e]];for(let e=0,t=r.length;e<t;e++){let t=r[e],i=Array.isArray(t.value)?t.value:[t.value];for(let e=0,r=i.length;e<r;e++){let r=i[e],a=_(r),o=n%16,s=o%a.boundary,c=o+s;n+=s,c!==0&&16-c<a.storage&&(n+=16-c),t.__data=new Float32Array(a.storage/Float32Array.BYTES_PER_ELEMENT),t.__offset=n,n+=a.storage}}}let r=n%16;return r>0&&(n+=16-r),e.__size=n,e.__cache={},this}function _(e){let t={boundary:0,storage:0};return typeof e==`number`||typeof e==`boolean`?(t.boundary=4,t.storage=4):e.isVector2?(t.boundary=8,t.storage=8):e.isVector3||e.isColor?(t.boundary=16,t.storage=12):e.isVector4?(t.boundary=16,t.storage=16):e.isMatrix3?(t.boundary=48,t.storage=48):e.isMatrix4?(t.boundary=64,t.storage=64):e.isTexture?F(`WebGLRenderer: Texture samplers can not be part of an uniforms group.`):ArrayBuffer.isView(e)?(t.boundary=16,t.storage=e.byteLength):F(`WebGLRenderer: Unsupported uniform value type.`,e),t}function v(t){let n=t.target;n.removeEventListener(`dispose`,v);let r=o.indexOf(n.__bindingPointIndex);o.splice(r,1),e.deleteBuffer(i[n.id]),delete i[n.id],delete a[n.id]}function y(){for(let t in i)e.deleteBuffer(i[t]);o=[],i={},a={}}return{bind:c,update:l,dispose:y}}var ud=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),dd=null;function fd(){return dd===null&&(dd=new Or(ud,16,16,S,p),dd.name=`DFG_LUT`,dd.minFilter=o,dd.magFilter=o,dd.wrapS=t,dd.wrapT=t,dd.generateMipmaps=!1,dd.needsUpdate=!0),dd}var pd=class{constructor(e={}){let{canvas:t=ue(),context:n=null,depth:r=!0,stencil:i=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:s=!0,preserveDrawingBuffer:f=!1,powerPreference:_=`default`,failIfMajorPerformanceCaveat:v=!1,reversedDepthBuffer:y=!1,outputBufferType:b=l}=e;this.isWebGLRenderer=!0;let S;if(n!==null){if(typeof WebGLRenderingContext<`u`&&n instanceof WebGLRenderingContext)throw Error(`THREE.WebGLRenderer: WebGL 1 is not supported since r163.`);S=n.getContextAttributes().alpha}else S=a;let T=b,E=new Set([w,C,x]),D=new Set([l,d,u,g,m,h]),O=new Uint32Array(4),k=new Int32Array(4),A=new V,j=null,M=null,ee=[],te=[],ne=null;this.domElement=t,this.debug={checkShaderErrors:!0,diagnostics:{keywords:!1},onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=0,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let P=this,re=!1,ie=null,ae=null,se=null,ce=null;this._outputColorSpace=N;let le=0,de=0,pe=null,he=-1,_e=null,ve=new st,ye=new st,be=null,xe=new U(0),Se=0,Ce=t.width,I=t.height,we=1,Te=null,Ee=null,De=new st(0,0,Ce,I),Oe=new st(0,0,Ce,I),ke=!1,Ae=new Wr,je=!1,Me=!1,Ne=new ft,Pe=new V,Fe=new st,Ie={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},Le=!1;function Re(){return pe===null?we:1}let L=n;function ze(e,n){return t.getContext(e,n)}let Be,Ve,R,He,z,B,Ue,We,Ge,Ke,qe,Je,Ye,Ze,Qe,$e,et,tt,nt,rt,it,at,ot;try{let e={alpha:!0,depth:r,stencil:i,antialias:o,premultipliedAlpha:s,preserveDrawingBuffer:f,powerPreference:_,failIfMajorPerformanceCaveat:v};if(`setAttribute`in t&&t.setAttribute(`data-engine`,`three.js r186`),t.addEventListener(`webglcontextlost`,dt,!1),t.addEventListener(`webglcontextrestored`,pt,!1),t.addEventListener(`webglcontextcreationerror`,mt,!1),L===null){let t=`webgl2`;if(L=ze(t,e),L===null)throw ze(t)?Error(`THREE.WebGLRenderer: Error creating WebGL context with your selected attributes.`):Error(`THREE.WebGLRenderer: Error creating WebGL context.`)}ct()}catch(e){throw t.removeEventListener(`webglcontextlost`,dt,!1),t.removeEventListener(`webglcontextrestored`,pt,!1),t.removeEventListener(`webglcontextcreationerror`,mt,!1),me(`WebGLRenderer: `+e.message),e}function ct(){Be=new jc(L),Be.init(),it=new td(L,Be),Ve=new oc(L,Be,e,it),R=new $u(L,Be),Ve.reversedDepthBuffer&&y&&R.buffers.depth.setReversed(!0),ae=L.createFramebuffer(),se=L.createFramebuffer(),ce=L.createFramebuffer(),He=new Pc(L),z=new Nu,B=new ed(L,Be,R,z,Ve,it,He),Ue=new Ac(P),We=new Zs(L),at=new ic(L,We),Ge=new Mc(L,We,He,at),Ke=new Ic(L,Ge,We,at,He),tt=new Fc(L,Ve,B),Qe=new sc(z),qe=new Mu(P,Ue,Be,Ve,at,Qe),Je=new cd(P,z),Ye=new Lu,Ze=new Wu(Be),et=new rc(P,Ue,R,Ke,S,s),$e=new Qu(P,Ke,Ve),ot=new ld(L,He,Ve,R),nt=new ac(L,Be,He),rt=new Nc(L,Be,He),He.programs=qe.programs,P.capabilities=Ve,P.extensions=Be,P.properties=z,P.renderLists=Ye,P.shadowMap=$e,P.state=R,P.info=He}T!==1009&&(ne=new Rc(T,t.width,t.height,o,r,i));let ut=new ad(P,L);this.xr=ut,this.getContext=function(){return L},this.getContextAttributes=function(){return L.getContextAttributes()},this.forceContextLoss=function(){let e=Be.get(`WEBGL_lose_context`);e&&e.loseContext()},this.forceContextRestore=function(){let e=Be.get(`WEBGL_lose_context`);e&&e.restoreContext()},this.getPixelRatio=function(){return we},this.setPixelRatio=function(e){e!==void 0&&(we=e,this.setSize(Ce,I,!1))},this.getSize=function(e){return e.set(Ce,I)},this.setSize=function(e,n,r=!0){if(ut.isPresenting){F(`WebGLRenderer: Can't change size while VR device is presenting.`);return}Ce=e,I=n,t.width=Math.floor(e*we),t.height=Math.floor(n*we),r===!0&&(t.style.width=e+`px`,t.style.height=n+`px`),ne!==null&&ne.setSize(t.width,t.height),this.setViewport(0,0,e,n)},this.getDrawingBufferSize=function(e){return e.set(Ce*we,I*we).floor()},this.setDrawingBufferSize=function(e,n,r){Ce=e,I=n,we=r,t.width=Math.floor(e*r),t.height=Math.floor(n*r),this.setViewport(0,0,e,n)},this.setEffects=function(e){if(T===1009){me(`WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.`);return}if(e){for(let t=0;t<e.length;t++)if(e[t].isOutputPass===!0){F(`WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.`);break}}ne.setEffects(e||[])},this.getCurrentViewport=function(e){return e.copy(ve)},this.getViewport=function(e){return e.copy(De)},this.setViewport=function(e,t,n,r){e.isVector4?De.set(e.x,e.y,e.z,e.w):De.set(e,t,n,r),R.viewport(ve.copy(De).multiplyScalar(we).round())},this.getScissor=function(e){return e.copy(Oe)},this.setScissor=function(e,t,n,r){e.isVector4?Oe.set(e.x,e.y,e.z,e.w):Oe.set(e,t,n,r),R.scissor(ye.copy(Oe).multiplyScalar(we).round())},this.getScissorTest=function(){return ke},this.setScissorTest=function(e){R.setScissorTest(ke=e)},this.setOpaqueSort=function(e){Te=e},this.setTransparentSort=function(e){Ee=e},this.getClearColor=function(e){return e.copy(et.getClearColor())},this.setClearColor=function(){et.setClearColor(...arguments)},this.getClearAlpha=function(){return et.getClearAlpha()},this.setClearAlpha=function(){et.setClearAlpha(...arguments)},this.clear=function(e=!0,t=!0,n=!0){let r=0;if(e){let e=!1;if(pe!==null){let t=pe.texture.format;e=E.has(t)}if(e){let e=pe.texture.type,t=D.has(e),n=et.getClearColor(),r=et.getClearAlpha(),i=n.r,a=n.g,o=n.b;t?(O[0]=i,O[1]=a,O[2]=o,O[3]=r,L.clearBufferuiv(L.COLOR,0,O)):(k[0]=i,k[1]=a,k[2]=o,k[3]=r,L.clearBufferiv(L.COLOR,0,k))}else r|=L.COLOR_BUFFER_BIT}t&&(r|=L.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),n&&(r|=L.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),r!==0&&L.clear(r)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(e){e.setRenderer(this),ie=e},this.dispose=function(){t.removeEventListener(`webglcontextlost`,dt,!1),t.removeEventListener(`webglcontextrestored`,pt,!1),t.removeEventListener(`webglcontextcreationerror`,mt,!1),et.dispose(),Ye.dispose(),Ze.dispose(),z.dispose(),Ue.dispose(),Ke.dispose(),at.dispose(),ot.dispose(),qe.dispose(),ut.dispose(),ut.removeEventListener(`sessionstart`,xt),ut.removeEventListener(`sessionend`,St),Ct.stop()};function dt(e){e.preventDefault(),fe(`WebGLRenderer: Context Lost.`),re=!0}function pt(){fe(`WebGLRenderer: Context Restored.`),re=!1;let e=He.autoReset,t=$e.enabled,n=$e.autoUpdate,r=$e.needsUpdate,i=$e.type;ct(),He.autoReset=e,$e.enabled=t,$e.autoUpdate=n,$e.needsUpdate=r,$e.type=i}function mt(e){me(`WebGLRenderer: A WebGL context could not be created. Reason: `,e.statusMessage)}function ht(e){let t=e.target;t.removeEventListener(`dispose`,ht),gt(t)}function gt(e){_t(e),z.remove(e)}function _t(e){let t=z.get(e).programs;t!==void 0&&(t.forEach(function(e){qe.releaseProgram(e)}),e.isShaderMaterial&&qe.releaseShaderCache(e))}this.renderBufferDirect=function(e,t,n,r,i,a){t===null&&(t=Ie);let o=i.isMesh&&i.matrixWorld.determinantAffine()<0,s=Nt(e,t,n,r,i);R.setMaterial(r,o);let c=n.index,l=1;if(r.wireframe===!0){if(c=Ge.getWireframeAttribute(n),c===void 0)return;l=2}let u=n.drawRange,d=n.attributes.position,f=u.start*l,p=(u.start+u.count)*l;a!==null&&(f=Math.max(f,a.start*l),p=Math.min(p,(a.start+a.count)*l)),c===null?d!=null&&(f=Math.max(f,0),p=Math.min(p,d.count)):(f=Math.max(f,0),p=Math.min(p,c.count));let m=p-f;if(m<0||m===1/0)return;at.setup(i,r,s,n,c);let h,g=nt;if(c!==null&&(h=We.get(c),g=rt,g.setIndex(h)),i.isMesh)r.wireframe===!0?(R.setLineWidth(r.wireframeLinewidth*Re()),g.setMode(L.LINES)):g.setMode(L.TRIANGLES);else if(i.isLine){let e=r.linewidth;e===void 0&&(e=1),R.setLineWidth(e*Re()),i.isLineSegments?g.setMode(L.LINES):i.isLineLoop?g.setMode(L.LINE_LOOP):g.setMode(L.LINE_STRIP)}else i.isPoints?g.setMode(L.POINTS):i.isSprite&&g.setMode(L.TRIANGLES);if(i.isBatchedMesh){if(Be.get(`WEBGL_multi_draw`))g.renderMultiDraw(i._multiDrawStarts,i._multiDrawCounts,i._multiDrawCount);else{let e=i._multiDrawStarts,t=i._multiDrawCounts,n=i._multiDrawCount,a=c?We.get(c).bytesPerElement:1,o=z.get(r).currentProgram.getUniforms();for(let r=0;r<n;r++)o.setValue(L,`_gl_DrawID`,r),g.render(e[r]/a,t[r])}}else if(i.isInstancedMesh)g.renderInstances(f,m,i.count);else if(n.isInstancedBufferGeometry){let e=n._maxInstanceCount===void 0?1/0:n._maxInstanceCount,t=Math.min(n.instanceCount,e);g.renderInstances(f,m,t)}else g.render(f,m)};function vt(e,t,n,r){ie!==null&&e.isNodeMaterial&&ie.setObject(r,e),je===!0&&Qe.setState(e,n,!1),e.transparent===!0&&e.side===2&&e.forceSinglePass===!1?(e.side=1,e.needsUpdate=!0,kt(e,t,r),e.side=0,e.needsUpdate=!0,kt(e,t,r),e.side=2):kt(e,t,r)}this.compile=function(e,t,n=null){n===null&&(n=e),ie!==null&&ie.renderStart(e,t,n),M=Ze.get(n),M.init(t),te.push(M),n.traverseVisible(function(e){e.isLight&&e.layers.test(t.layers)&&(M.pushLight(e),e.castShadow&&M.pushShadow(e))}),e!==n&&e.traverseVisible(function(e){e.isLight&&e.layers.test(t.layers)&&(M.pushLight(e),e.castShadow&&M.pushShadow(e))}),M.setupLights(),ie!==null&&ie.updateLights(M.state.lightsArray),Me=this.localClippingEnabled,je=Qe.init(this.clippingPlanes,Me),je===!0&&Qe.setGlobalState(this.clippingPlanes,t),ie!==null&&$e.render(M.state.shadowsArray,n,t);let r=new Set;return e.traverse(function(e){if(!(e.isMesh||e.isPoints||e.isLine||e.isSprite))return;let i=e.material;if(i){if(Array.isArray(i))for(let a=0;a<i.length;a++){let o=i[a];vt(o,n,t,e),r.add(o)}else vt(i,n,t,e),r.add(i)}}),M=te.pop(),ie!==null&&ie.renderEnd(),r},this.compileAsync=function(e,t,n=null){let r=this.compile(e,t,n);return new Promise(t=>{function n(){if(r.forEach(function(e){let t=z.get(e).currentProgram;(t===void 0||t.isReady())&&r.delete(e)}),r.size===0){t(e);return}setTimeout(n,10)}Be.get(`KHR_parallel_shader_compile`)===null?setTimeout(n,10):n()})};let yt=null;function bt(e){yt&&yt(e)}function xt(){Ct.stop()}function St(){Ct.start()}let Ct=new Xs;Ct.setAnimationLoop(bt),typeof self<`u`&&Ct.setContext(self),this.setAnimationLoop=function(e){yt=e,ut.setAnimationLoop(e),e===null?Ct.stop():Ct.start()},ut.addEventListener(`sessionstart`,xt),ut.addEventListener(`sessionend`,St),this.render=function(e,t){if(t!==void 0&&t.isCamera!==!0){me(`WebGLRenderer.render: camera is not an instance of THREE.Camera.`);return}if(re===!0)return;ie!==null&&ie.renderStart(e,t);let n=ut.enabled===!0&&ut.isPresenting===!0,r=ne!==null&&(pe===null||n)&&ne.begin(P,pe);if(e.matrixWorldAutoUpdate===!0&&e.updateMatrixWorld(),t.parent===null&&t.matrixWorldAutoUpdate===!0&&t.updateMatrixWorld(),ut.enabled===!0&&ut.isPresenting===!0&&(ne===null||ne.isCompositing()===!1)&&(ut.cameraAutoUpdate===!0&&ut.updateCamera(t),t=ut.getCamera()),e.isScene===!0&&e.onBeforeRender(P,e,t,pe),M=Ze.get(e,te.length),M.init(t),M.state.textureUnits=B.getTextureUnits(),te.push(M),Ne.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),Ae.setFromProjectionMatrix(Ne,oe,t.reversedDepth),Me=this.localClippingEnabled,je=Qe.init(this.clippingPlanes,Me),j=Ye.get(e,ee.length),j.init(),ee.push(j),ut.enabled===!0&&ut.isPresenting===!0){let e=P.xr.getDepthSensingMesh();e!==null&&wt(e,t,-1/0,P.sortObjects)}wt(e,t,0,P.sortObjects),j.finish(),ie!==null&&ie.updateLights(M.state.lightsArray),P.sortObjects===!0&&j.sort(Te,Ee),Le=ut.enabled===!1||ut.isPresenting===!1||ut.hasDepthSensing()===!1,Le&&et.addToRenderList(j,e),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),je===!0&&Qe.beginShadows();let i=M.state.shadowsArray;if($e.render(i,e,t),je===!0&&Qe.endShadows(),(r&&ne.hasRenderPass())===!1){let n=j.opaque,r=j.transmissive;if(M.setupLights(),t.isArrayCamera){let i=t.cameras;if(r.length>0)for(let t=0,a=i.length;t<a;t++){let a=i[t];Et(n,r,e,a)}Le&&et.render(e);for(let t=0,n=i.length;t<n;t++){let n=i[t];Tt(j,e,n,n.viewport)}}else r.length>0&&Et(n,r,e,t),Le&&et.render(e),Tt(j,e,t)}pe!==null&&de===0&&(B.updateMultisampleRenderTarget(pe),B.updateRenderTargetMipmap(pe)),r&&ne.end(P),e.isScene===!0&&e.onAfterRender(P,e,t),at.resetDefaultState(),he=-1,_e=null,te.pop(),te.length>0?(M=te[te.length-1],B.setTextureUnits(M.state.textureUnits),je===!0&&Qe.setGlobalState(P.clippingPlanes,M.state.camera)):M=null,ee.pop(),j=ee.length>0?ee[ee.length-1]:null,ie!==null&&ie.renderEnd()};function wt(e,t,n,r){if(e.visible===!1)return;if(e.layers.test(t.layers)){if(e.isGroup)n=e.renderOrder;else if(e.isLOD)e.autoUpdate===!0&&e.update(t);else if(e.isLightProbeGrid)M.pushLightProbeGrid(e);else if(e.isLight)M.pushLight(e),e.castShadow&&M.pushShadow(e);else if(e.isSprite){if(!e.frustumCulled||e.intersectsFrustum(Ae)){r&&Fe.setFromMatrixPosition(e.matrixWorld).applyMatrix4(Ne);let i=Ke.update(e),a=e.material;a.visible&&j.push(e,i,a,n,Fe.z,null,t)}}else if((e.isMesh||e.isLine||e.isPoints)&&(!e.frustumCulled||e.intersectsFrustum(Ae))){let i=Ke.update(e),a=e.material;if(r&&(e.boundingSphere===void 0?(i.boundingSphere===null&&i.computeBoundingSphere(),Fe.copy(i.boundingSphere.center)):(e.boundingSphere===null&&e.computeBoundingSphere(),Fe.copy(e.boundingSphere.center)),Fe.applyMatrix4(e.matrixWorld).applyMatrix4(Ne)),Array.isArray(a)){let r=i.groups;for(let o=0,s=r.length;o<s;o++){let s=r[o],c=a[s.materialIndex];c&&c.visible&&j.push(e,i,c,n,Fe.z,s,t)}}else a.visible&&j.push(e,i,a,n,Fe.z,null,t)}}let i=e.children;for(let e=0,a=i.length;e<a;e++)wt(i[e],t,n,r)}function Tt(e,t,n,r){let{opaque:i,transmissive:a,transparent:o}=e;M.setupLightsView(n),je===!0&&Qe.setGlobalState(P.clippingPlanes,n),r&&R.viewport(ve.copy(r)),i.length>0&&Dt(i,t,n),a.length>0&&Dt(a,t,n),o.length>0&&Dt(o,t,n),R.buffers.depth.setTest(!0),R.buffers.depth.setMask(!0),R.buffers.color.setMask(!0),R.setPolygonOffset(!1)}function Et(e,t,n,r){if((n.isScene===!0?n.overrideMaterial:null)!==null)return;if(M.state.transmissionRenderTarget[r.id]===void 0){let e=Be.has(`EXT_color_buffer_half_float`)||Be.has(`EXT_color_buffer_float`);M.state.transmissionRenderTarget[r.id]=new lt(1,1,{generateMipmaps:!0,type:e?p:l,minFilter:c,samples:Math.max(4,Ve.samples),stencilBuffer:i,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,colorSpace:Xe.workingColorSpace})}let a=M.state.transmissionRenderTarget[r.id],o=r.viewport||ve;a.setSize(o.z*P.transmissionResolutionScale,o.w*P.transmissionResolutionScale);let s=P.getRenderTarget(),u=P.getActiveCubeFace(),d=P.getActiveMipmapLevel();P.setRenderTarget(a),P.getClearColor(xe),Se=P.getClearAlpha(),Se<1&&P.setClearColor(16777215,.5),P.clear(),Le&&et.render(n);let f=P.toneMapping;P.toneMapping=0;let m=r.viewport;if(r.viewport!==void 0&&(r.viewport=void 0),M.setupLightsView(r),je===!0&&Qe.setGlobalState(P.clippingPlanes,r),Dt(e,n,r),B.updateMultisampleRenderTarget(a),B.updateRenderTargetMipmap(a),Be.has(`WEBGL_multisampled_render_to_texture`)===!1){let e=!1;for(let i=0,a=t.length;i<a;i++){let{object:a,geometry:o,material:s,group:c}=t[i];if(s.side===2&&a.layers.test(r.layers)){let t=s.side;s.side=1,s.needsUpdate=!0,Ot(a,n,r,o,s,c),s.side=t,s.needsUpdate=!0,e=!0}}e===!0&&(B.updateMultisampleRenderTarget(a),B.updateRenderTargetMipmap(a))}P.setRenderTarget(s,u,d),P.setClearColor(xe,Se),m!==void 0&&(r.viewport=m),P.toneMapping=f}function Dt(e,t,n){let r=t.isScene===!0?t.overrideMaterial:null;for(let i=0,a=e.length;i<a;i++){let a=e[i],{object:o,geometry:s,group:c}=a,l=a.material;l.allowOverride===!0&&r!==null&&(l=r),o.layers.test(n.layers)&&Ot(o,t,n,s,l,c)}}function Ot(e,t,n,r,i,a){ie!==null&&i.isNodeMaterial&&ie.setObject(e,i),e.onBeforeRender(P,t,n,r,i,a),e.modelViewMatrix.multiplyMatrices(n.matrixWorldInverse,e.matrixWorld),e.normalMatrix.getNormalMatrix(e.modelViewMatrix),i.onBeforeRender(P,t,n,r,e,a),i.transparent===!0&&i.side===2&&i.forceSinglePass===!1?(i.side=1,i.needsUpdate=!0,P.renderBufferDirect(n,t,r,i,e,a),i.side=0,i.needsUpdate=!0,P.renderBufferDirect(n,t,r,i,e,a),i.side=2):P.renderBufferDirect(n,t,r,i,e,a),e.onAfterRender(P,t,n,r,i,a)}function kt(e,t,n){t.isScene!==!0&&(t=Ie);let r=z.get(e),i=M.state.lights,a=M.state.shadowsArray,o=i.state.version,s=qe.getParameters(e,i.state,a,t,n,M.state.lightProbeGridArray),c=qe.getProgramCacheKey(s),l=r.programs;r.environment=e.isMeshStandardMaterial||e.isMeshLambertMaterial||e.isMeshPhongMaterial?t.environment:null,r.fog=t.fog;let u=e.isMeshStandardMaterial||e.isMeshLambertMaterial&&!e.envMap||e.isMeshPhongMaterial&&!e.envMap;r.envMap=Ue.get(e.envMap||r.environment,u),r.envMapRotation=r.environment!==null&&e.envMap===null?t.environmentRotation:e.envMapRotation,l===void 0&&(e.addEventListener(`dispose`,ht),l=new Map,r.programs=l);let d=l.get(c);if(d!==void 0){if(r.currentProgram===d&&r.lightsStateVersion===o)return jt(e,s),d}else s.uniforms=qe.getUniforms(e),ie!==null&&e.isNodeMaterial&&ie.build(e,n,s),e.onBeforeCompile(s,P),d=qe.acquireProgram(s,c),l.set(c,d),r.uniforms=s.uniforms;let f=r.uniforms;return(!e.isShaderMaterial&&!e.isRawShaderMaterial||e.clipping===!0)&&(f.clippingPlanes=Qe.uniform),jt(e,s),r.needsLights=Ft(e),r.lightsStateVersion=o,r.needsLights&&(f.ambientLightColor.value=i.state.ambient,f.lightProbe.value=i.state.probe,f.sunLights.value=i.state.sun,f.sunLightShadows.value=i.state.sunShadow,f.directionalLights.value=i.state.directional,f.directionalLightShadows.value=i.state.directionalShadow,f.spotLights.value=i.state.spot,f.spotLightShadows.value=i.state.spotShadow,f.rectAreaLights.value=i.state.rectArea,f.ltc_1.value=i.state.rectAreaLTC1,f.ltc_2.value=i.state.rectAreaLTC2,f.pointLights.value=i.state.point,f.pointLightShadows.value=i.state.pointShadow,f.hemisphereLights.value=i.state.hemi,f.sunShadowMatrix.value=i.state.sunShadowMatrix,f.sunShadowCascade.value=i.state.sunShadowCascade,f.directionalShadowMatrix.value=i.state.directionalShadowMatrix,f.spotLightMatrix.value=i.state.spotLightMatrix,f.spotLightMap.value=i.state.spotLightMap,f.pointShadowMatrix.value=i.state.pointShadowMatrix),r.lightProbeGrid=M.state.lightProbeGridArray.length>0,r.currentProgram=d,r.uniformsList=null,d}function At(e){if(e.uniformsList===null){let t=e.currentProgram.getUniforms();e.uniformsList=Gl.seqWithValue(t.seq,e.uniforms)}return e.uniformsList}function jt(e,t){let n=z.get(e);n.outputColorSpace=t.outputColorSpace,n.batching=t.batching,n.batchingColor=t.batchingColor,n.instancing=t.instancing,n.instancingColor=t.instancingColor,n.instancingMorph=t.instancingMorph,n.skinning=t.skinning,n.morphTargets=t.morphTargets,n.morphNormals=t.morphNormals,n.morphColors=t.morphColors,n.morphTargetsCount=t.morphTargetsCount,n.numClippingPlanes=t.numClippingPlanes,n.numIntersection=t.numClipIntersection,n.vertexAlphas=t.vertexAlphas,n.vertexTangents=t.vertexTangents,n.toneMapping=t.toneMapping}function Mt(e,t){if(e.length===0)return null;if(e.length===1)return e[0].texture===null?null:e[0];A.setFromMatrixPosition(t.matrixWorld);for(let t=0,n=e.length;t<n;t++){let n=e[t];if(n.texture!==null&&n.boundingBox.containsPoint(A))return n}return null}function Nt(e,t,n,r,i){t.isScene!==!0&&(t=Ie),B.resetTextureUnits();let a=t.fog,o=r.isMeshStandardMaterial||r.isMeshLambertMaterial||r.isMeshPhongMaterial?t.environment:null,s=pe===null?P.outputColorSpace:pe.isXRRenderTarget===!0?pe.texture.colorSpace:Xe.workingColorSpace,c=r.isMeshStandardMaterial||r.isMeshLambertMaterial&&!r.envMap||r.isMeshPhongMaterial&&!r.envMap,l=Ue.get(r.envMap||o,c),u=r.vertexColors===!0&&!!n.attributes.color&&n.attributes.color.itemSize===4,d=!!n.attributes.tangent&&(!!r.normalMap||r.anisotropy>0),f=!!n.morphAttributes.position,p=!!n.morphAttributes.normal,m=!!n.morphAttributes.color,h=0;r.toneMapped&&(pe===null||pe.isXRRenderTarget===!0)&&(h=P.toneMapping);let g=n.morphAttributes.position||n.morphAttributes.normal||n.morphAttributes.color,_=g===void 0?0:g.length,v=z.get(r),y=M.state.lights;if(je===!0&&(Me===!0||e!==_e)){let t=e===_e&&r.id===he;Qe.setState(r,e,t)}let b=!1;r.version===v.__version?v.needsLights&&v.lightsStateVersion!==y.state.version?b=!0:v.outputColorSpace===s?i.isBatchedMesh&&v.batching===!1||!i.isBatchedMesh&&v.batching===!0||i.isBatchedMesh&&v.batchingColor===!0&&i._colorsTexture===null||i.isBatchedMesh&&v.batchingColor===!1&&i._colorsTexture!==null||i.isInstancedMesh&&v.instancing===!1||!i.isInstancedMesh&&v.instancing===!0||i.isSkinnedMesh&&v.skinning===!1||!i.isSkinnedMesh&&v.skinning===!0||i.isInstancedMesh&&v.instancingColor===!0&&i.instanceColor===null||i.isInstancedMesh&&v.instancingColor===!1&&i.instanceColor!==null||i.isInstancedMesh&&v.instancingMorph===!0&&i.morphTexture===null||i.isInstancedMesh&&v.instancingMorph===!1&&i.morphTexture!==null?b=!0:v.envMap===l?r.fog===!0&&v.fog!==a||v.numClippingPlanes!==void 0&&(v.numClippingPlanes!==Qe.numPlanes||v.numIntersection!==Qe.numIntersection)?b=!0:v.vertexAlphas===u&&v.vertexTangents===d&&v.morphTargets===f&&v.morphNormals===p&&v.morphColors===m&&v.toneMapping===h&&v.morphTargetsCount===_?!!v.lightProbeGrid!=M.state.lightProbeGridArray.length>0&&(b=!0):b=!0:b=!0:b=!0:(b=!0,v.__version=r.version);let x=v.currentProgram;b===!0&&(x=kt(r,t,i),ie&&r.isNodeMaterial&&ie.onUpdateProgram(r,x,v));let S=!1,C=!1,w=!1,T=x.getUniforms(),E=v.uniforms;if(R.useProgram(x.program)&&(S=!0,C=!0,w=!0),r.id!==he&&(he=r.id,C=!0),v.needsLights){let e=Mt(M.state.lightProbeGridArray,i);v.lightProbeGrid!==e&&(v.lightProbeGrid=e,C=!0)}if(S||_e!==e){R.buffers.depth.getReversed()&&e.reversedDepth!==!0&&(e._reversedDepth=!0,e.updateProjectionMatrix()),T.setValue(L,`projectionMatrix`,e.projectionMatrix),T.setValue(L,`viewMatrix`,e.matrixWorldInverse);let t=T.map.cameraPosition;t!==void 0&&t.setValue(L,Pe.setFromMatrixPosition(e.matrixWorld)),Ve.logarithmicDepthBuffer&&T.setValue(L,`logDepthBufFC`,2/(Math.log(e.far+1)/Math.LN2)),(r.isMeshPhongMaterial||r.isMeshToonMaterial||r.isMeshLambertMaterial||r.isMeshBasicMaterial||r.isMeshStandardMaterial||r.isShaderMaterial)&&T.setValue(L,`isOrthographic`,e.isOrthographicCamera===!0),_e!==e&&(_e=e,C=!0,w=!0)}if(v.needsLights&&(y.state.sunShadowMap.length>0&&T.setValue(L,`sunShadowMap`,y.state.sunShadowMap,B),y.state.directionalShadowMap.length>0&&T.setValue(L,`directionalShadowMap`,y.state.directionalShadowMap,B),y.state.spotShadowMap.length>0&&T.setValue(L,`spotShadowMap`,y.state.spotShadowMap,B),y.state.pointShadowMap.length>0&&T.setValue(L,`pointShadowMap`,y.state.pointShadowMap,B)),i.isSkinnedMesh){T.setOptional(L,i,`bindMatrix`),T.setOptional(L,i,`bindMatrixInverse`);let e=i.skeleton;e&&(e.boneTexture===null&&e.computeBoneTexture(),T.setValue(L,`boneTexture`,e.boneTexture,B))}i.isBatchedMesh&&(T.setOptional(L,i,`batchingTexture`),T.setValue(L,`batchingTexture`,i._matricesTexture,B),T.setOptional(L,i,`batchingIdTexture`),T.setValue(L,`batchingIdTexture`,i._indirectTexture,B),T.setOptional(L,i,`batchingColorTexture`),i._colorsTexture!==null&&T.setValue(L,`batchingColorTexture`,i._colorsTexture,B));let D=n.morphAttributes;if((D.position!==void 0||D.normal!==void 0||D.color!==void 0)&&tt.update(i,n,x),(C||v.receiveShadow!==i.receiveShadow)&&(v.receiveShadow=i.receiveShadow,T.setValue(L,`receiveShadow`,i.receiveShadow)),(r.isMeshStandardMaterial||r.isMeshLambertMaterial||r.isMeshPhongMaterial)&&r.envMap===null&&t.environment!==null&&(E.envMapIntensity.value=t.environmentIntensity),E.dfgLUT!==void 0&&(E.dfgLUT.value=fd()),C){if(T.setValue(L,`toneMappingExposure`,P.toneMappingExposure),v.needsLights&&Pt(E,w),a&&r.fog===!0&&Je.refreshFogUniforms(E,a),Je.refreshMaterialUniforms(E,r,we,I,M.state.transmissionRenderTarget[e.id]),v.needsLights&&v.lightProbeGrid){let e=v.lightProbeGrid;E.probesSH.value=e.texture,E.probesMin.value.copy(e.boundingBox.min),E.probesMax.value.copy(e.boundingBox.max),E.probesResolution.value.copy(e.resolution)}Gl.upload(L,At(v),E,B)}if(r.isShaderMaterial&&r.uniformsNeedUpdate===!0&&(Gl.upload(L,At(v),E,B),r.uniformsNeedUpdate=!1),r.isSpriteMaterial&&T.setValue(L,`center`,i.center),T.setValue(L,`modelViewMatrix`,i.modelViewMatrix),T.setValue(L,`normalMatrix`,i.normalMatrix),T.setValue(L,`modelMatrix`,i.matrixWorld),r.uniformsGroups!==void 0){let e=r.uniformsGroups;for(let t=0,n=e.length;t<n;t++){let n=e[t];ot.update(n,x),ot.bind(n,x)}}return x}function Pt(e,t){e.ambientLightColor.needsUpdate=t,e.lightProbe.needsUpdate=t,e.sunLights.needsUpdate=t,e.sunLightShadows.needsUpdate=t,e.directionalLights.needsUpdate=t,e.directionalLightShadows.needsUpdate=t,e.pointLights.needsUpdate=t,e.pointLightShadows.needsUpdate=t,e.spotLights.needsUpdate=t,e.spotLightShadows.needsUpdate=t,e.rectAreaLights.needsUpdate=t,e.hemisphereLights.needsUpdate=t}function Ft(e){return e.isMeshLambertMaterial||e.isMeshToonMaterial||e.isMeshPhongMaterial||e.isMeshStandardMaterial||e.isShadowMaterial||e.isShaderMaterial&&e.lights===!0}this.getActiveCubeFace=function(){return le},this.getActiveMipmapLevel=function(){return de},this.getRenderTarget=function(){return pe},this.setRenderTargetTextures=function(e,t,n){let r=z.get(e);r.__autoAllocateDepthBuffer=e.resolveDepthBuffer===!1,r.__autoAllocateDepthBuffer===!1&&(r.__useRenderToTexture=!1),z.get(e.texture).__webglTexture=t,z.get(e.depthTexture).__webglTexture=r.__autoAllocateDepthBuffer?void 0:n,r.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(e,t){let n=z.get(e);n.__webglFramebuffer=t,n.__useDefaultFramebuffer=t===void 0},this.setRenderTarget=function(e,t=0,n=0){pe=e,le=t,de=n;let r=null,i=!1,a=!1;if(e){let o=z.get(e);if(o.__useDefaultFramebuffer!==void 0){R.bindFramebuffer(L.FRAMEBUFFER,o.__webglFramebuffer),ve.copy(e.viewport),ye.copy(e.scissor),be=e.scissorTest,R.viewport(ve),R.scissor(ye),R.setScissorTest(be),he=-1;return}if(o.__webglFramebuffer===void 0)B.setupRenderTarget(e);else if(o.__hasExternalTextures)B.rebindTextures(e,z.get(e.texture).__webglTexture,z.get(e.depthTexture).__webglTexture);else if(e.depthBuffer){let t=e.depthTexture;if(o.__boundDepthTexture!==t){if(t!==null&&z.has(t)&&(e.width!==t.image.width||e.height!==t.image.height))throw Error(`THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.`);B.setupDepthRenderbuffer(e)}}let s=e.texture;(s.isData3DTexture||s.isDataArrayTexture||s.isCompressedArrayTexture)&&(a=!0);let c=z.get(e).__webglFramebuffer;e.isWebGLCubeRenderTarget?(r=Array.isArray(c[t])?c[t][n]:c[t],i=!0):r=e.samples>0&&B.useMultisampledRTT(e)===!1?z.get(e).__webglMultisampledFramebuffer:Array.isArray(c)?c[n]:c,ve.copy(e.viewport),ye.copy(e.scissor),be=e.scissorTest}else ve.copy(De).multiplyScalar(we).floor(),ye.copy(Oe).multiplyScalar(we).floor(),be=ke;if(n!==0&&(r=ae),R.bindFramebuffer(L.FRAMEBUFFER,r)&&R.drawBuffers(e,r),R.viewport(ve),R.scissor(ye),R.setScissorTest(be),i){let r=z.get(e.texture);L.framebufferTexture2D(L.FRAMEBUFFER,L.COLOR_ATTACHMENT0,L.TEXTURE_CUBE_MAP_POSITIVE_X+t,r.__webglTexture,n)}else if(a){let r=t;for(let t=0;t<e.textures.length;t++){let i=z.get(e.textures[t]);L.framebufferTextureLayer(L.FRAMEBUFFER,L.COLOR_ATTACHMENT0+t,i.__webglTexture,n,r)}}else if(e!==null&&n!==0){let t=z.get(e.texture);L.framebufferTexture2D(L.FRAMEBUFFER,L.COLOR_ATTACHMENT0,L.TEXTURE_2D,t.__webglTexture,n)}he=-1};function It(e){let t=z.get(e);return(t.__readFormat!==e.format||t.__readType!==e.type)&&(t.__readFormat=e.format,t.__readType=e.type,t.__formatReadable=Ve.textureFormatReadable(e.format),t.__typeReadable=Ve.textureTypeReadable(e.type)),t}this.readRenderTargetPixels=function(e,t,n,r,i,a,o,s=0){if(!(e&&e.isWebGLRenderTarget)){me(`WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.`);return}let c=z.get(e).__webglFramebuffer;if(e.isWebGLCubeRenderTarget&&o!==void 0&&(c=c[o]),c){R.bindFramebuffer(L.FRAMEBUFFER,c);try{let o=e.textures[s],c=o.format,l=o.type;e.textures.length>1&&L.readBuffer(L.COLOR_ATTACHMENT0+s);let u=It(o);if(u.__formatReadable===!1){me(`WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.`);return}if(u.__typeReadable===!1){me(`WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.`);return}t>=0&&t<=e.width-r&&n>=0&&n<=e.height-i&&L.readPixels(t,n,r,i,it.convert(c),it.convert(l),a)}finally{let e=pe===null?null:z.get(pe).__webglFramebuffer;R.bindFramebuffer(L.FRAMEBUFFER,e)}}},this.readRenderTargetPixelsAsync=async function(e,t,n,r,i,a,o,s=0){if(!(e&&e.isWebGLRenderTarget))throw Error(`THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.`);let c=z.get(e).__webglFramebuffer;if(e.isWebGLCubeRenderTarget&&o!==void 0&&(c=c[o]),c){if(t>=0&&t<=e.width-r&&n>=0&&n<=e.height-i){R.bindFramebuffer(L.FRAMEBUFFER,c);let o=e.textures[s],l=o.format,u=o.type;e.textures.length>1&&L.readBuffer(L.COLOR_ATTACHMENT0+s);let d=It(o);if(d.__formatReadable===!1)throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.`);if(d.__typeReadable===!1)throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.`);let f=L.createBuffer();L.bindBuffer(L.PIXEL_PACK_BUFFER,f),L.bufferData(L.PIXEL_PACK_BUFFER,a.byteLength,L.STREAM_READ),L.readPixels(t,n,r,i,it.convert(l),it.convert(u),0),L.bindBuffer(L.PIXEL_PACK_BUFFER,null);let p=pe===null?null:z.get(pe).__webglFramebuffer;R.bindFramebuffer(L.FRAMEBUFFER,p);let m=L.fenceSync(L.SYNC_GPU_COMMANDS_COMPLETE,0);return L.flush(),await ge(L,m,4),L.bindBuffer(L.PIXEL_PACK_BUFFER,f),L.getBufferSubData(L.PIXEL_PACK_BUFFER,0,a),L.bindBuffer(L.PIXEL_PACK_BUFFER,null),L.deleteBuffer(f),L.deleteSync(m),a}throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.`)}},this.copyFramebufferToTexture=function(e,t=null,n=0){let r=2**-n,i=Math.floor(e.image.width*r),a=Math.floor(e.image.height*r),o=t===null?0:t.x,s=t===null?0:t.y;B.setTexture2D(e,0),L.copyTexSubImage2D(L.TEXTURE_2D,n,0,0,o,s,i,a),R.unbindTexture()},this.copyTextureToTexture=function(e,t,n=null,r=null,i=0,a=0){let o,s,c,l,u,d,f,p,m,h=e.isCompressedTexture?e.mipmaps[a]:e.image;if(n!==null)o=n.max.x-n.min.x,s=n.max.y-n.min.y,c=n.isBox3?n.max.z-n.min.z:1,l=n.min.x,u=n.min.y,d=n.isBox3?n.min.z:0;else{let t=2**-i;o=Math.floor(h.width*t),s=Math.floor(h.height*t),c=e.isDataArrayTexture?h.depth:e.isData3DTexture?Math.floor(h.depth*t):1,l=0,u=0,d=0}r===null?(f=0,p=0,m=0):(f=r.x,p=r.y,m=r.z);let g=it.convert(t.format),_=it.convert(t.type),v;t.isData3DTexture?(B.setTexture3D(t,0),v=L.TEXTURE_3D):t.isDataArrayTexture||t.isCompressedArrayTexture?(B.setTexture2DArray(t,0),v=L.TEXTURE_2D_ARRAY):(B.setTexture2D(t,0),v=L.TEXTURE_2D),R.activeTexture(L.TEXTURE0),R.pixelStorei(L.UNPACK_FLIP_Y_WEBGL,t.flipY),R.pixelStorei(L.UNPACK_PREMULTIPLY_ALPHA_WEBGL,t.premultiplyAlpha),R.pixelStorei(L.UNPACK_ALIGNMENT,t.unpackAlignment);let y=R.getParameter(L.UNPACK_ROW_LENGTH),b=R.getParameter(L.UNPACK_IMAGE_HEIGHT),x=R.getParameter(L.UNPACK_SKIP_PIXELS),S=R.getParameter(L.UNPACK_SKIP_ROWS),C=R.getParameter(L.UNPACK_SKIP_IMAGES);R.pixelStorei(L.UNPACK_ROW_LENGTH,h.width),R.pixelStorei(L.UNPACK_IMAGE_HEIGHT,h.height),R.pixelStorei(L.UNPACK_SKIP_PIXELS,l),R.pixelStorei(L.UNPACK_SKIP_ROWS,u),R.pixelStorei(L.UNPACK_SKIP_IMAGES,d);let w=e.isDataArrayTexture||e.isData3DTexture,T=t.isDataArrayTexture||t.isData3DTexture;if(e.isDepthTexture){let n=z.get(e),r=z.get(t),h=z.get(n.__renderTarget),g=z.get(r.__renderTarget);R.bindFramebuffer(L.READ_FRAMEBUFFER,h.__webglFramebuffer),R.bindFramebuffer(L.DRAW_FRAMEBUFFER,g.__webglFramebuffer);for(let n=0;n<c;n++)w&&(L.framebufferTextureLayer(L.READ_FRAMEBUFFER,L.COLOR_ATTACHMENT0,z.get(e).__webglTexture,i,d+n),L.framebufferTextureLayer(L.DRAW_FRAMEBUFFER,L.COLOR_ATTACHMENT0,z.get(t).__webglTexture,a,m+n)),L.blitFramebuffer(l,u,o,s,f,p,o,s,L.DEPTH_BUFFER_BIT,L.NEAREST);R.bindFramebuffer(L.READ_FRAMEBUFFER,null),R.bindFramebuffer(L.DRAW_FRAMEBUFFER,null)}else if(i!==0||e.isRenderTargetTexture||z.has(e)){let n=z.get(e),r=z.get(t);R.bindFramebuffer(L.READ_FRAMEBUFFER,se),R.bindFramebuffer(L.DRAW_FRAMEBUFFER,ce);for(let e=0;e<c;e++)w?L.framebufferTextureLayer(L.READ_FRAMEBUFFER,L.COLOR_ATTACHMENT0,n.__webglTexture,i,d+e):L.framebufferTexture2D(L.READ_FRAMEBUFFER,L.COLOR_ATTACHMENT0,L.TEXTURE_2D,n.__webglTexture,i),T?L.framebufferTextureLayer(L.DRAW_FRAMEBUFFER,L.COLOR_ATTACHMENT0,r.__webglTexture,a,m+e):L.framebufferTexture2D(L.DRAW_FRAMEBUFFER,L.COLOR_ATTACHMENT0,L.TEXTURE_2D,r.__webglTexture,a),i===0?T?L.copyTexSubImage3D(v,a,f,p,m+e,l,u,o,s):L.copyTexSubImage2D(v,a,f,p,l,u,o,s):L.blitFramebuffer(l,u,o,s,f,p,o,s,L.COLOR_BUFFER_BIT,L.NEAREST);R.bindFramebuffer(L.READ_FRAMEBUFFER,null),R.bindFramebuffer(L.DRAW_FRAMEBUFFER,null)}else T?e.isDataTexture||e.isData3DTexture?L.texSubImage3D(v,a,f,p,m,o,s,c,g,_,h.data):t.isCompressedArrayTexture?L.compressedTexSubImage3D(v,a,f,p,m,o,s,c,g,h.data):L.texSubImage3D(v,a,f,p,m,o,s,c,g,_,h):e.isDataTexture?L.texSubImage2D(L.TEXTURE_2D,a,f,p,o,s,g,_,h.data):e.isCompressedTexture?L.compressedTexSubImage2D(L.TEXTURE_2D,a,f,p,h.width,h.height,g,h.data):L.texSubImage2D(L.TEXTURE_2D,a,f,p,o,s,g,_,h);R.pixelStorei(L.UNPACK_ROW_LENGTH,y),R.pixelStorei(L.UNPACK_IMAGE_HEIGHT,b),R.pixelStorei(L.UNPACK_SKIP_PIXELS,x),R.pixelStorei(L.UNPACK_SKIP_ROWS,S),R.pixelStorei(L.UNPACK_SKIP_IMAGES,C),a===0&&t.generateMipmaps&&L.generateMipmap(v),R.unbindTexture()},this.initRenderTarget=function(e){z.get(e).__webglFramebuffer===void 0&&B.setupRenderTarget(e)},this.initTexture=function(e){e.isCubeTexture?B.setTextureCube(e,0):e.isData3DTexture?B.setTexture3D(e,0):e.isDataArrayTexture||e.isCompressedArrayTexture?B.setTexture2DArray(e,0):B.setTexture2D(e,0),R.unbindTexture()},this.resetState=function(){le=0,de=0,pe=null,R.reset(),at.reset()},typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`observe`,{detail:this}))}get coordinateSystem(){return oe}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;let t=this.getContext();t.drawingBufferColorSpace=Xe._getDrawingBufferColorSpace(e),t.unpackColorSpace=Xe._getUnpackColorSpace()}},md={name:`CopyShader`,uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`},hd=class{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error(`THREE.Pass: .render() must be implemented in derived pass.`)}dispose(){}},gd=new hs(-1,1,1,-1,0,1),_d=new class extends Hn{constructor(){super(),this.setAttribute(`position`,new W([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute(`uv`,new W([0,2,0,0,2,0],2))}},vd=class{constructor(e){this._mesh=new G(_d,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,gd)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}},yd=class extends hd{constructor(e,t=`tDiffuse`){super(),this.textureID=t,this.uniforms=null,this.material=null,e instanceof oo?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=ro.clone(e.uniforms),this.material=new oo({name:e.name===void 0?`unspecified`:e.name,defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this._fsQuad=new vd(this.material)}render(e,t,n){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=n.texture),this._fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}},bd=class extends hd{constructor(e,t){super(),this.scene=e,this.camera=t,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,t,n){let r=e.getContext(),i=e.state;i.buffers.color.setMask(!1),i.buffers.depth.setMask(!1),i.buffers.color.setLocked(!0),i.buffers.depth.setLocked(!0);let a,o;this.inverse?(a=0,o=1):(a=1,o=0),i.buffers.stencil.setTest(!0),i.buffers.stencil.setOp(r.REPLACE,r.REPLACE,r.REPLACE),i.buffers.stencil.setFunc(r.ALWAYS,a,4294967295),i.buffers.stencil.setClear(o),i.buffers.stencil.setLocked(!0),e.setRenderTarget(n),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(t),this.clear&&e.clear(),e.render(this.scene,this.camera),i.buffers.color.setLocked(!1),i.buffers.depth.setLocked(!1),i.buffers.color.setMask(!0),i.buffers.depth.setMask(!0),i.buffers.stencil.setLocked(!1),i.buffers.stencil.setFunc(r.EQUAL,1,4294967295),i.buffers.stencil.setOp(r.KEEP,r.KEEP,r.KEEP),i.buffers.stencil.setLocked(!0)}},xd=class extends hd{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}},Sd=class{constructor(e,t){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),t===void 0){let n=e.getSize(new z);this._width=n.width,this._height=n.height,t=new lt(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:p}),t.texture.name=`EffectComposer.rt1`}else this._width=t.width,this._height=t.height;this.renderTarget1=t,this.renderTarget2=t.clone(),this.renderTarget2.texture.name=`EffectComposer.rt2`,this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new yd(md),this.copyPass.material.blending=0,this.timer=new Es}swapBuffers(){let e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,t){this.passes.splice(t,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){let t=this.passes.indexOf(e);t!==-1&&this.passes.splice(t,1)}isLastEnabledPass(e){for(let t=e+1;t<this.passes.length;t++)if(this.passes[t].enabled)return!1;return!0}render(e){this.timer.update(),e===void 0&&(e=this.timer.getDelta());let t=this.renderer.getRenderTarget(),n=!1;for(let t=0,r=this.passes.length;t<r;t++){let r=this.passes[t];if(r.enabled!==!1){if(r.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(t),r.render(this.renderer,this.writeBuffer,this.readBuffer,e,n),r.needsSwap){if(n){let t=this.renderer.getContext(),n=this.renderer.state.buffers.stencil;n.setFunc(t.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),n.setFunc(t.EQUAL,1,4294967295)}this.swapBuffers()}bd!==void 0&&(r instanceof bd?n=!0:r instanceof xd&&(n=!1))}}this.renderer.setRenderTarget(t)}reset(e){if(e===void 0){let t=this.renderer.getSize(new z);this._pixelRatio=this.renderer.getPixelRatio(),this._width=t.width,this._height=t.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,t){this._width=e,this._height=t;let n=this._width*this._pixelRatio,r=this._height*this._pixelRatio;this.renderTarget1.setSize(n,r),this.renderTarget2.setSize(n,r);for(let e=0;e<this.passes.length;e++)this.passes[e].setSize(n,r)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}},Cd=class extends hd{constructor(e,t,n=null,r=null,i=null){super(),this.scene=e,this.camera=t,this.overrideMaterial=n,this.clearColor=r,this.clearAlpha=i,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this.isRenderPass=!0,this._oldClearColor=new U}render(e,t,n){let r=e.autoClear;e.autoClear=!1;let i,a;this.overrideMaterial!==null&&(a=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor,e.getClearAlpha())),this.clearAlpha!==null&&(i=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth==1&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:n),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(i),this.overrideMaterial!==null&&(this.scene.overrideMaterial=a),e.autoClear=r}},wd={name:`LuminosityHighPassShader`,uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new U(0)},defaultOpacity:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform vec3 defaultColor;
		uniform float defaultOpacity;
		uniform float luminosityThreshold;
		uniform float smoothWidth;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );

			float v = luminance( texel.xyz );

			vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );

			float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );

			gl_FragColor = mix( outputColor, texel, alpha );

		}`},Td=class e extends hd{constructor(e,t=1,n,r){super(),this.strength=t,this.radius=n,this.threshold=r,this.resolution=e===void 0?new z(256,256):new z(e.x,e.y),this.clearColor=new U(0,0,0),this.needsSwap=!1,this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let i=Math.round(this.resolution.x/2),a=Math.round(this.resolution.y/2);this.renderTargetBright=new lt(i,a,{type:p,depthBuffer:!1}),this.renderTargetBright.texture.name=`UnrealBloomPass.bright`,this.renderTargetBright.texture.generateMipmaps=!1;for(let e=0;e<this.nMips;e++){let t=new lt(i,a,{type:p,depthBuffer:!1});t.texture.name=`UnrealBloomPass.h`+e,t.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(t);let n=new lt(i,a,{type:p,depthBuffer:!1});n.texture.name=`UnrealBloomPass.v`+e,n.texture.generateMipmaps=!1,this.renderTargetsVertical.push(n),i=Math.round(i/2),a=Math.round(a/2)}let o=wd;this.highPassUniforms=ro.clone(o.uniforms),this.highPassUniforms.luminosityThreshold.value=r,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new oo({uniforms:this.highPassUniforms,vertexShader:o.vertexShader,fragmentShader:o.fragmentShader}),this.separableBlurMaterials=[];let s=[6,10,14,18,22];i=Math.round(this.resolution.x/2),a=Math.round(this.resolution.y/2);for(let e=0;e<this.nMips;e++)this.separableBlurMaterials.push(this._getSeparableBlurMaterial(s[e])),this.separableBlurMaterials[e].uniforms.invSize.value=new z(1/i,1/a),i=Math.round(i/2),a=Math.round(a/2);this.compositeMaterial=this._getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=t,this.compositeMaterial.uniforms.bloomRadius.value=.1;let c=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=c,this.bloomTintColors=[new V(1,1,1),new V(1,1,1),new V(1,1,1),new V(1,1,1),new V(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,this.copyUniforms=ro.clone(md.uniforms),this.blendMaterial=new oo({uniforms:this.copyUniforms,vertexShader:md.vertexShader,fragmentShader:md.fragmentShader,premultipliedAlpha:!0,blending:2,depthTest:!1,depthWrite:!1,transparent:!0}),this._oldClearColor=new U,this._oldClearAlpha=1,this._basic=new rr,this._fsQuad=new vd(null)}dispose(){for(let e=0;e<this.renderTargetsHorizontal.length;e++)this.renderTargetsHorizontal[e].dispose();for(let e=0;e<this.renderTargetsVertical.length;e++)this.renderTargetsVertical[e].dispose();this.renderTargetBright.dispose();for(let e=0;e<this.separableBlurMaterials.length;e++)this.separableBlurMaterials[e].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this._basic.dispose(),this._fsQuad.dispose()}setSize(e,t){let n=Math.round(e/2),r=Math.round(t/2);this.renderTargetBright.setSize(n,r);for(let e=0;e<this.nMips;e++)this.renderTargetsHorizontal[e].setSize(n,r),this.renderTargetsVertical[e].setSize(n,r),this.separableBlurMaterials[e].uniforms.invSize.value=new z(1/n,1/r),n=Math.round(n/2),r=Math.round(r/2)}render(t,n,r,i,a){t.getClearColor(this._oldClearColor),this._oldClearAlpha=t.getClearAlpha();let o=t.autoClear;t.autoClear=!1,t.setClearColor(this.clearColor,0),a&&t.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this._fsQuad.material=this._basic,this._basic.map=r.texture,t.setRenderTarget(null),t.clear(),this._fsQuad.render(t)),this.highPassUniforms.tDiffuse.value=r.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this._fsQuad.material=this.materialHighPassFilter,t.setRenderTarget(this.renderTargetBright),t.clear(),this._fsQuad.render(t);let s=this.renderTargetBright;for(let n=0;n<this.nMips;n++)this._fsQuad.material=this.separableBlurMaterials[n],this.separableBlurMaterials[n].uniforms.colorTexture.value=s.texture,this.separableBlurMaterials[n].uniforms.direction.value=e.BlurDirectionX,t.setRenderTarget(this.renderTargetsHorizontal[n]),t.clear(),this._fsQuad.render(t),this.separableBlurMaterials[n].uniforms.colorTexture.value=this.renderTargetsHorizontal[n].texture,this.separableBlurMaterials[n].uniforms.direction.value=e.BlurDirectionY,t.setRenderTarget(this.renderTargetsVertical[n]),t.clear(),this._fsQuad.render(t),s=this.renderTargetsVertical[n];this._fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,t.setRenderTarget(this.renderTargetsHorizontal[0]),t.clear(),this._fsQuad.render(t),this._fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,a&&t.state.buffers.stencil.setTest(!0),this.renderToScreen?(t.setRenderTarget(null),this._fsQuad.render(t)):(t.setRenderTarget(r),this._fsQuad.render(t)),t.setClearColor(this._oldClearColor,this._oldClearAlpha),t.autoClear=o}_getSeparableBlurMaterial(e){let t=[],n=e/3;for(let r=0;r<e;r++)t.push(.39894*Math.exp(-.5*r*r/(n*n))/n);let r=[],i=[];for(let n=1;n<e;n+=2){let a=t[n],o=n+1<e?t[n+1]:0,s=a+o;r.push((n*a+(n+1)*o)/s),i.push(s)}return new oo({defines:{KERNEL_PAIRS:r.length},uniforms:{colorTexture:{value:null},invSize:{value:new z(.5,.5)},direction:{value:new z(.5,.5)},centerWeight:{value:t[0]},gaussianOffsets:{value:r},gaussianWeights:{value:i}},vertexShader:`

				varying vec2 vUv;

				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}`,fragmentShader:`

				#include <common>

				varying vec2 vUv;

				uniform sampler2D colorTexture;
				uniform vec2 invSize;
				uniform vec2 direction;
				uniform float centerWeight;
				uniform float gaussianOffsets[KERNEL_PAIRS];
				uniform float gaussianWeights[KERNEL_PAIRS];

				void main() {

					vec3 diffuseSum = texture2D( colorTexture, vUv ).rgb * centerWeight;

					for ( int i = 0; i < KERNEL_PAIRS; i ++ ) {

						vec2 uvOffset = direction * invSize * gaussianOffsets[ i ];
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset ).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset ).rgb;
						diffuseSum += ( sample1 + sample2 ) * gaussianWeights[ i ];

					}

					gl_FragColor = vec4( diffuseSum, 1.0 );

				}`})}_getCompositeMaterial(e){return new oo({defines:{NUM_MIPS:e},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`

				varying vec2 vUv;

				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}`,fragmentShader:`

				varying vec2 vUv;

				uniform sampler2D blurTexture1;
				uniform sampler2D blurTexture2;
				uniform sampler2D blurTexture3;
				uniform sampler2D blurTexture4;
				uniform sampler2D blurTexture5;
				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];

				float lerpBloomFactor( const in float factor ) {

					float mirrorFactor = 1.2 - factor;
					return mix( factor, mirrorFactor, bloomRadius );

				}

				void main() {

					// 3.0 for backwards compatibility with previous alpha-based intensity
					vec3 bloom = 3.0 * bloomStrength * (
						lerpBloomFactor( bloomFactors[ 0 ] ) * bloomTintColors[ 0 ] * texture2D( blurTexture1, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 1 ] ) * bloomTintColors[ 1 ] * texture2D( blurTexture2, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 2 ] ) * bloomTintColors[ 2 ] * texture2D( blurTexture3, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 3 ] ) * bloomTintColors[ 3 ] * texture2D( blurTexture4, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 4 ] ) * bloomTintColors[ 4 ] * texture2D( blurTexture5, vUv ).rgb
					);

					float bloomAlpha = max( bloom.r, max( bloom.g, bloom.b ) );
					gl_FragColor = vec4( bloom, bloomAlpha );

				}`})}};Td.BlurDirectionX=new z(1,0),Td.BlurDirectionY=new z(0,1);var Ed={name:`OutputShader`,uniforms:{tDiffuse:{value:null},toneMappingExposure:{value:1}},vertexShader:`
		precision highp float;

		uniform mat4 modelViewMatrix;
		uniform mat4 projectionMatrix;

		attribute vec3 position;
		attribute vec2 uv;

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		precision highp float;

		uniform sampler2D tDiffuse;

		#include <tonemapping_pars_fragment>
		#include <colorspace_pars_fragment>

		varying vec2 vUv;

		void main() {

			gl_FragColor = texture2D( tDiffuse, vUv );

			// tone mapping

			#ifdef LINEAR_TONE_MAPPING

				gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );

			#elif defined( REINHARD_TONE_MAPPING )

				gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );

			#elif defined( CINEON_TONE_MAPPING )

				gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );

			#elif defined( ACES_FILMIC_TONE_MAPPING )

				gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );

			#elif defined( AGX_TONE_MAPPING )

				gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );

			#elif defined( NEUTRAL_TONE_MAPPING )

				gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );

			#elif defined( CUSTOM_TONE_MAPPING )

				gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );

			#endif

			// color space

			#ifdef SRGB_TRANSFER

				gl_FragColor = sRGBTransferOETF( gl_FragColor );

			#endif

		}`},Dd=class extends hd{constructor(){super(),this.isOutputPass=!0,this.uniforms=ro.clone(Ed.uniforms),this.material=new so({name:Ed.name,uniforms:this.uniforms,vertexShader:Ed.vertexShader,fragmentShader:Ed.fragmentShader}),this._fsQuad=new vd(this.material),this._outputColorSpace=null,this._toneMapping=null}render(e,t,n){this.uniforms.tDiffuse.value=n.texture,this.uniforms.toneMappingExposure.value=e.toneMappingExposure,(this._outputColorSpace!==e.outputColorSpace||this._toneMapping!==e.toneMapping)&&(this._outputColorSpace=e.outputColorSpace,this._toneMapping=e.toneMapping,this.material.defines={},Xe.getTransfer(this._outputColorSpace)===`srgb`&&(this.material.defines.SRGB_TRANSFER=``),this._toneMapping===1?this.material.defines.LINEAR_TONE_MAPPING=``:this._toneMapping===2?this.material.defines.REINHARD_TONE_MAPPING=``:this._toneMapping===3?this.material.defines.CINEON_TONE_MAPPING=``:this._toneMapping===4?this.material.defines.ACES_FILMIC_TONE_MAPPING=``:this._toneMapping===6?this.material.defines.AGX_TONE_MAPPING=``:this._toneMapping===7?this.material.defines.NEUTRAL_TONE_MAPPING=``:this._toneMapping===5&&(this.material.defines.CUSTOM_TONE_MAPPING=``),this.material.needsUpdate=!0),this.renderToScreen===!0?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}},Od=Math.sqrt(3),kd=Math.sqrt(5),Ad=.5*(Od-1),jd=(3-Od)/6;(kd-1)/4,(5-kd)/20;var Md=e=>Math.floor(e)|0,Nd=new Float64Array([1,1,-1,1,1,-1,-1,-1,1,0,-1,0,1,0,-1,0,0,1,0,-1,0,1,0,-1]);function Pd(e=Math.random){let t=Fd(e),n=new Float64Array(t).map(e=>Nd[e%12*2]),r=new Float64Array(t).map(e=>Nd[e%12*2+1]);return function(e,i){let a=0,o=0,s=0,c=(e+i)*Ad,l=Md(e+c),u=Md(i+c),d=(l+u)*jd,f=l-d,p=u-d,m=e-f,h=i-p,g,_;m>h?(g=1,_=0):(g=0,_=1);let v=m-g+jd,y=h-_+jd,b=m-1+2*jd,x=h-1+2*jd,S=l&255,C=u&255,w=.5-m*m-h*h;if(w>=0){let e=S+t[C],i=n[e],o=r[e];w*=w,a=w*w*(i*m+o*h)}let T=.5-v*v-y*y;if(T>=0){let e=S+g+t[C+_],i=n[e],a=r[e];T*=T,o=T*T*(i*v+a*y)}let E=.5-b*b-x*x;if(E>=0){let e=S+1+t[C+1],i=n[e],a=r[e];E*=E,s=E*E*(i*b+a*x)}return 70*(a+o+s)}}function Fd(e){let t=new Uint8Array(512);for(let e=0;e<256;e++)t[e]=e;for(let n=0;n<255;n++){let r=n+~~(e()*(256-n)),i=t[n];t[n]=t[r],t[r]=i}for(let e=256;e<512;e++)t[e]=t[e-256];return t}var Id=(e,t,n)=>Math.max(t,Math.min(n,e)),Ld=(e,t,n)=>e+(t-e)*n,q=(e,t,n)=>{let r=Id((n-e)/(t-e),0,1);return r*r*(3-2*r)},J=(e,t,n,r)=>Ld(e,t,1-Math.exp(-n*r));function Rd(e){for(;e>Math.PI;)e-=Math.PI*2;for(;e<-Math.PI;)e+=Math.PI*2;return e}function zd(e,t,n,r){return e+Rd(t-e)*(1-Math.exp(-n*r))}function Bd(e){return function(){e|=0,e=e+1831565813|0;let t=Math.imul(e^e>>>15,1|e);return t=t+Math.imul(t^t>>>7,61|t)^t,((t^t>>>14)>>>0)/4294967296}}function Vd(e,t,n,r,i,a){let o=i-n,s=a-r,c=o*o+s*s,l=c>0?((e-n)*o+(t-r)*s)/c:0;l=Id(l,0,1);let u=n+o*l,d=r+s*l;return Math.hypot(e-u,t-d)}var Y={crash:{x:30,z:40,r:30,name:`Crash Site`},town:{x:-170,z:-110,r:75,name:`Dusty Gulch`},ranch:{x:190,z:-70,r:60,name:`McCready Ranch`},lake:{x:70,z:250,r:70,name:`Lake Serenity`},mine:{x:-330,z:300,r:35,name:`Silver Spur Mine`},lookout:{x:330,z:230,r:40,name:`Lookout Hill`},bridge:{x:-252,z:-34,r:20,name:`Old Mill Bridge`}},Hd=.6,Ud=[[-720,-330],[-600,-300],[-470,-250],[-340,-190],[-262,-40],[-150,40],[-40,120],[20,205],[70,250],[150,300],[260,372],[380,418],[520,470],[720,530]],Wd=[[[-240,-110],[-170,-110],[-100,-104],[-20,-80],[60,-72],[130,-76],[190,-70]],[[-240,-110],[-262,-60],[-250,-10],[-290,90],[-305,200],[-325,285]],[[190,-70],[205,20],[185,120],[135,190]],[[-20,-80],[0,-20]]],Gd=2.6,Kd=[{x:30,z:40,w:92,d:72,rot:.25,crop:`corn`},{x:255,z:-5,w:70,d:48,rot:.1,crop:`wheat`},{x:118,z:-150,w:64,d:44,rot:-.2,crop:`wheat`},{x:262,z:-150,w:52,d:48,rot:.05,crop:`corn`},{x:-70,z:-175,w:56,d:34,rot:.3,crop:`sunflower`},{x:-80,z:-30,w:60,d:40,rot:-.15,crop:`wheat`}],qd=[{x:-170,z:-110,r:80},{x:195,z:-75,r:62},{x:-330,z:295,r:34},{x:30,z:40,r:40}],Jd=1400;Jd/2,Jd/280;var Yd=Bd(1887),Xd=Pd(Yd),Zd=Pd(Yd),Qd=Pd(Yd);function $d(e,t,n,r){let i=1,a=1,o=0,s=0;for(let c=0;c<r;c++)o+=i*e(t*a,n*a),s+=i,i*=.5,a*=2.03;return o/s}function ef(e,t){let n=1,r=1,i=0,a=0;for(let o=0;o<5;o++){let o=1-Math.abs(Zd(e*r,t*r));o*=o,i+=n*o,a+=n,n*=.42,r*=2.05}return i/a}function tf(e,t,n){let r=Id(.5+.5*(e-t)/n,0,1);return Ld(t,e,r)+n*r*(1-r)}var nf=class{constructor(e,t,n=6){this.max=t,this.cell=40,this.map=new Map,this.paths=[];for(let r of e){let e=new Ni(r.map(([e,t])=>new V(e,0,t)),!1,`centripetal`),i=e.getLength(),a=e.getSpacedPoints(Math.max(2,Math.round(i/n)));this.paths.push(a);for(let e=0;e<a.length-1;e++){let n=a[e],r=a[e+1],i=[n.x,n.z,r.x,r.z],o=Math.floor((Math.min(n.x,r.x)-t)/this.cell),s=Math.floor((Math.max(n.x,r.x)+t)/this.cell),c=Math.floor((Math.min(n.z,r.z)-t)/this.cell),l=Math.floor((Math.max(n.z,r.z)+t)/this.cell);for(let e=o;e<=s;e++)for(let t=c;t<=l;t++){let n=e*10007+t,r=this.map.get(n);r||this.map.set(n,r=[]),r.push(i)}}}}dist(e,t){let n=this.map.get(Math.floor(e/this.cell)*10007+Math.floor(t/this.cell));if(!n)return this.max;let r=this.max;for(let i of n){let n=Vd(e,t,i[0],i[1],i[2],i[3]);n<r&&(r=n)}return r}},rf=new nf([Ud],120,5),af=new nf(Wd,12,4);function of(e,t){for(let n of Kd){let r=Math.cos(-n.rot),i=Math.sin(-n.rot),a=e-n.x,o=t-n.z,s=a*r-o*i,c=a*i+o*r;if(Math.abs(s)<n.w/2&&Math.abs(c)<n.d/2)return{f:n,lx:s,lz:c}}return null}function sf(e,t){return q(420,640,Math.hypot(e,t)+Zd(e*.004,t*.004)*70)}function cf(e,t){let n=4+$d(Xd,e*.0035,t*.0035,4)*8+$d(Qd,e*.02,t*.02,2)*.8,r=sf(e,t);n+=r*r*(30+ef(e*.005,t*.005)*210);let i=Math.hypot(e-Y.lookout.x,t-Y.lookout.z);return n+=32*Math.exp(-(i*i)/5e3),tf(n,2.2,2)}for(let e of qd)e.h=cf(e.x,e.z);function lf(e,t){let n=cf(e,t);for(let r of qd){let i=Math.hypot(e-r.x,t-r.z);i<r.r*1.7&&(n=Ld(n,r.h,q(r.r*1.7,r.r,i)))}let r=Math.hypot(e-Y.crash.x,t-Y.crash.z);n+=-2.6*Math.exp(-(r*r)/98)+.9*Math.exp(-((r-10)**2)/10);let i=sf(e,t),a=rf.dist(e,t),o=9*(1+i*3);n=Ld(n,2.4+a*.02,q(o*4.5,o*1.1,a)*(.85-i*.2)),n=Ld(n,Hd-2.4,q(9,9*.3,a));let s=Y.lake,c=Math.hypot(e-s.x,t-s.z),l=s.r*(1+.16*Xd(e*.02,t*.02));n=Ld(n,2,q(l*1.9,l*1.05,c)*.85),n=Ld(n,Hd-5.5,q(l,l*.3,c));let u=Math.hypot(e-(s.x+18),t-(s.z+12));n=Ld(n,Hd+1.4,q(9,4,u));let d=af.dist(e,t);return n-=.12*q(Gd+1,Gd-1,d),n}var uf=new Float32Array(78961),df=new Float32Array(78961),ff=new Float32Array(315844),pf=new Float32Array(315844),mf={corn:.95,wheat:.65,sunflower:.9},hf=new Float32Array(78961);for(let e=0;e<281;e++)for(let t=0;t<281;t++)uf[e*281+t]=lf(-700+t*5,-700+e*5);function X(e,t){let n=Id((e+700)/5,0,279.9999),r=Id((t+700)/5,0,279.9999),i=Math.floor(n),a=Math.floor(r),o=n-i,s=r-a,c=uf[a*281+i],l=uf[a*281+i+1],u=uf[(a+1)*281+i],d=uf[(a+1)*281+i+1];return o+s<=1?c+(l-c)*o+(u-c)*s:d+(u-d)*(1-o)+(l-d)*(1-s)}function gf(e,t,n=new V){let r=1.5,i=X(e+r,t)-X(e-r,t),a=X(e,t+r)-X(e,t-r);return n.set(-i,2*r,-a).normalize()}function _f(e,t){return X(e,t)<Hd-.05}var vf=e=>new U(e),yf={lush:vf(`#5f8a35`),grass:vf(`#86963f`),dry:vf(`#c2a45a`),straw:vf(`#d6b56a`),road:vf(`#a07d58`),soil:vf(`#7a5638`),fieldGround:vf(`#8c6b3d`),rock:vf(`#857468`),rockDark:vf(`#5e5560`),snow:vf(`#f4f1ec`),sand:vf(`#d9c38c`),mud:vf(`#5d5a3e`),scorched:vf(`#2f2a25`),town:vf(`#b08a62`)};function bf(e,t,n,r,i,a){let o=$d(Qd,e*.008,t*.008,3),s=q(-.35,.55,o+(n-6)*.02);i.copy(yf.lush).lerp(yf.grass,q(-.6,.1,o)).lerp(yf.dry,s*.8);let c=Xd(e*.09,t*.09);i.lerp(yf.straw,q(.55,.9,c)*.35);let l=1,u=sf(e,t),d=Id(q(.35,.75,r)+q(40,90,n)*u,0,1);if(d>0){let n=yf.rock.clone().lerp(yf.rockDark,q(-.3,.6,Zd(e*.02,t*.02)));i.lerp(n,d),l*=1-d}ff[a*4+2]=d;let f=q(88,118,n+Xd(e*.03,t*.03)*16)*(1-q(.9,1.4,r)*.6);f>0&&(i.lerp(yf.snow,f),l*=1-f),pf[a*4]=f;let p=rf.dist(e,t),m=Y.lake,h=Math.hypot(e-m.x,t-m.z),g=m.r*(1+.16*Xd(e*.02,t*.02)),_=Math.max(q(12.15,9*.95,p),q(g*1.1,g*.95,h));_>0&&(i.lerp(yf.sand,_*.85),l*=1-_),ff[a*4+3]=_,n<.6&&(i.lerp(yf.mud,q(Hd,Hd-2,n)),l=0);for(let n of[Y.town,Y.ranch,Y.mine]){let r=Math.hypot(e-n.x,t-n.z),o=q(n.r*.7,n.r*.25,r+Xd(e*.05,t*.05)*12)*(n===Y.town?.8:.5);o>0&&(i.lerp(yf.town,o),l*=1-o*.9,pf[a*4+3]=Math.max(pf[a*4+3],o))}{let n=Math.max(-248-e,e- -158,0),r=Math.max(-138-t,t- -84,0),o=q(10,0,Math.hypot(n,r)+Xd(e*.08,t*.08)*4)*.85;o>0&&(i.lerp(yf.town,o),l*=1-o,pf[a*4+3]=Math.max(pf[a*4+3],o))}let v=of(e,t);if(v){let e=q(0,3,Math.min(v.f.w/2-Math.abs(v.lx),v.f.d/2-Math.abs(v.lz))),t=.5+.5*Math.sin(v.lx*1.6),n=(v.f.crop===`sunflower`?yf.lush:yf.fieldGround).clone().lerp(yf.soil,t*.2);i.lerp(n,e),l*=1-e,ff[a*4+1]=e,pf[a*4+1]=(v.lx+v.f.w/2-1)/mf[v.f.crop]}let y=af.dist(e,t),b=q(Gd+1.8,Gd-.6,y+Xd(e*.2,t*.2)*.8);b>0&&(i.lerp(yf.road,b),l*=1-b),ff[a*4]=b;let x=q(16,6,Math.hypot(e-Y.crash.x,t-Y.crash.z)+Xd(e*.15,t*.15)*3);x>0&&(i.lerp(yf.scorched,x*.9),l*=1-x),pf[a*4+2]=x,df[a]=l,hf[a]=s}function xf(e){e.uniforms.uWater={value:Hd},e.vertexShader=e.vertexShader.replace(`#include <common>`,`#include <common>
attribute vec4 aMatA; attribute vec4 aMatB;
varying vec4 vMatA; varying vec4 vMatB; varying vec3 vWPos;`).replace(`#include <worldpos_vertex>`,`#include <worldpos_vertex>
vWPos = (modelMatrix * vec4(transformed,1.0)).xyz; vMatA = aMatA; vMatB = aMatB;`),e.fragmentShader=e.fragmentShader.replace(`#include <common>`,`#include <common>
uniform float uWater;
varying vec4 vMatA; varying vec4 vMatB; varying vec3 vWPos;
float th(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
vec2 th2(vec2 p){ return fract(sin(vec2(dot(p, vec2(127.1,311.7)), dot(p, vec2(269.5,183.3))))*43758.5453); }
float tn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(th(i),th(i+vec2(1,0)),f.x), mix(th(i+vec2(0,1)),th(i+vec2(1,1)),f.x), f.y); }
float tfbm(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<4;i++){ s+=a*tn(p); p=p*2.07+vec2(1.7,9.2); a*=0.5; } return s; }
// distance to nearest random point (pebbles / grains)
float cells(vec2 p, out float id){
  vec2 i = floor(p), f = fract(p); float md = 8.0; id = 0.0;
  for (int y=-1;y<=1;y++) for (int x=-1;x<=1;x++){
    vec2 g = vec2(float(x), float(y)); vec2 o = th2(i+g);
    float d = length(g + o - f); if (d < md){ md = d; id = th(i+g+3.1); }
  }
  return md;
}
vec3 bumpN(vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection) {
  vec3 vSigmaX = normalize(dFdx(surf_pos)); vec3 vSigmaY = normalize(dFdy(surf_pos));
  vec3 R1 = cross(vSigmaY, surf_norm); vec3 R2 = cross(surf_norm, vSigmaX);
  float fDet = dot(vSigmaX, R1) * faceDirection;
  vec3 vGrad = sign(fDet) * (dHdxy.x * R1 + dHdxy.y * R2);
  return normalize(abs(fDet) * surf_norm - vGrad);
}`).replace(`#include <color_fragment>`,`#include <color_fragment>
  vec2 wp = vWPos.xz;
  float dist = length(vWPos - cameraPosition);
  float near = 1.0 - smoothstep(35.0, 140.0, dist);
  float road = vMatA.x, field = vMatA.y, rock = vMatA.z, sand = vMatA.w;
  float snow = vMatB.x, furrow = vMatB.y, scorch = vMatB.z, dirt = vMatB.w;
  float grassW = clamp(1.0 - road - field - rock - sand - snow - scorch - dirt * 0.8, 0.0, 1.0);
  float macro = tfbm(wp * 0.012);
  float mid = tfbm(wp * 0.15);
  float fine = tn(wp * 3.1) * 0.6 + tn(wp * 7.3) * 0.4;
  float hBump = 0.0;
  vec3 col = diffuseColor.rgb;
  col *= 0.86 + 0.28 * macro;
  // grassland floor: mottled patches, dry tufts, wildflower specks
  {
    float patchy = smoothstep(0.35, 0.75, mid);
    vec3 g = mix(col, col * vec3(0.78, 0.86, 0.62), patchy * 0.6);
    float streak = tn(vec2(wp.x * 2.2 + wp.y * 0.9, wp.y * 0.35 - wp.x * 0.2));
    g = mix(g, g * vec3(1.25, 1.15, 0.85), smoothstep(0.62, 0.9, streak) * 0.45);
    g *= 0.9 + fine * 0.2;
    vec2 fc = floor(wp * 2.3);
    float fh = th(fc);
    vec2 fo = fract(wp * 2.3) - 0.5 - (th2(fc) - 0.5) * 0.6;
    float flower = step(0.975, fh) * smoothstep(0.12, 0.05, length(fo)) * near;
    vec3 fcol = fh > 0.992 ? vec3(0.95, 0.9, 0.85) : fh > 0.985 ? vec3(0.6, 0.45, 0.85) : vec3(0.98, 0.78, 0.2);
    g = mix(g, fcol, flower * 0.85);
    // under the grass blades the ground reads as thatch, not lawn
    float underGrass = 1.0 - smoothstep(55.0, 100.0, dist);
    g = mix(g, g * vec3(0.72, 0.66, 0.46) + vec3(0.03, 0.025, 0.0), underGrass * 0.75);
    col = mix(col, g, grassW);
    hBump += (fine - 0.5) * 0.03 * grassW;
  }
  // dirt roads & town: pebbles, cracks, ruts
  float dirtW = clamp(road + dirt * 0.9, 0.0, 1.0);
  if (dirtW > 0.01) {
    float id;
    float c = cells(wp * 5.0, id);
    float pebble = smoothstep(0.28, 0.12, c) * step(0.55, id) * near;
    vec3 d = col * (0.88 + mid * 0.24);
    d = mix(d, d * mix(vec3(0.7, 0.66, 0.62), vec3(1.35, 1.28, 1.18), fract(id * 7.0)), pebble);
    float crack = smoothstep(0.55, 0.8, tfbm(wp * 0.7)) * 0.5 * near;
    d *= 1.0 - crack * 0.25;
    float ruts = smoothstep(0.35, 0.0, abs(abs(fract(road * 3.0 - 0.1) - 0.5) - 0.3)) * road * 0.12;
    d *= 1.0 - ruts;
    col = mix(col, d, dirtW);
    hBump += (pebble * 0.05 - crack * 0.03 + (fine - 0.5) * 0.015) * dirtW;
  }
  // plowed furrows between crop rows
  if (field > 0.01) {
    float ph = fract(furrow);
    float ridge = 1.0 - abs(ph - 0.5) * 2.0;          // 1 at mid-row (between plants), 0 at plant rows
    ridge = smoothstep(0.0, 1.0, ridge);
    vec3 f = col * mix(0.7, 1.15, 1.0 - ridge);
    float clod = tn(wp * 6.0);
    f *= 0.9 + clod * 0.2;
    float straw = smoothstep(0.78, 0.92, tn(vec2(wp.x * 9.0, wp.y * 1.3) + furrow)) * near * (1.0 - scorch);
    f = mix(f, f * vec3(1.35, 1.25, 1.0), straw * 0.5);
    col = mix(col, f, field);
    hBump += (-ridge * 0.09 + clod * 0.02) * field;
  }
  // rock strata
  if (rock > 0.01) {
    float near2 = 1.0 - smoothstep(40.0, 220.0, dist);
    float band = sin(vWPos.y * 0.9 + mid * 4.0 + macro * 6.0) * near2;
    float grit = tfbm(wp * 0.45 + vWPos.y * 0.2);
    vec3 r = col * (0.82 + 0.12 * band + 0.3 * (grit - 0.5) + 0.08 * fine);
    r = mix(r, r * vec3(1.1, 0.95, 0.85), smoothstep(0.4, 0.9, macro) * 0.5);
    col = mix(col, r, rock);
    hBump += (band * 0.05 + (grit - 0.5) * 0.12) * rock;
  }
  // sand: ripples + wet band at the waterline
  if (sand > 0.01) {
    float rip = sin(dot(wp, vec2(0.8, 0.55)) * 5.5 + mid * 6.0);
    vec3 s = col * (0.95 + rip * 0.04 + fine * 0.08);
    float wet = smoothstep(uWater + 0.7, uWater + 0.1, vWPos.y);
    s *= mix(1.0, 0.62, wet);
    col = mix(col, s, sand);
    hBump += rip * 0.012 * sand * near;
  }
  if (snow > 0.01) {
    col = mix(col, col * (0.94 + fine * 0.1), snow);
  }
  if (scorch > 0.01) {
    float ember = smoothstep(0.8, 0.95, tn(wp * 1.7)) * scorch;
    col = mix(col, col * (0.7 + mid * 0.5), scorch);
    col += vec3(0.08, 0.03, 0.0) * ember;
    hBump += (fine - 0.5) * 0.03 * scorch;
  }
  diffuseColor.rgb = col;
  float groundH = hBump * near;
  float wetR = sand * smoothstep(uWater + 0.7, uWater + 0.1, vWPos.y);`).replace(`#include <roughnessmap_fragment>`,`#include <roughnessmap_fragment>
  roughnessFactor = mix(roughnessFactor, 0.45, wetR);
  roughnessFactor = mix(roughnessFactor, 0.7, snow);`).replace(`#include <normal_fragment_maps>`,`#include <normal_fragment_maps>
  normal = bumpN(-vViewPosition, normal, vec2(dFdx(groundH), dFdy(groundH)) * 1.6, faceDirection);`)}function Sf(){let e=new Float32Array(236883),t=new Float32Array(236883),n=new U;for(let r=0;r<281;r++)for(let i=0;i<281;i++){let a=r*281+i,o=-700+i*5,s=-700+r*5,c=uf[a];e[a*3]=o,e[a*3+1]=c,e[a*3+2]=s;let l=uf[r*281+Math.min(i+1,280)]-uf[r*281+Math.max(i-1,0)],u=uf[Math.min(r+1,280)*281+i]-uf[Math.max(r-1,0)*281+i];bf(o,s,c,Math.hypot(l,u)/10,n,a),t[a*3]=n.r,t[a*3+1]=n.g,t[a*3+2]=n.b}let r=new Uint32Array(470400),i=0;for(let e=0;e<280;e++)for(let t=0;t<280;t++){let n=e*281+t,a=(e+1)*281+t,o=(e+1)*281+t+1,s=e*281+t+1;r[i++]=n,r[i++]=a,r[i++]=s,r[i++]=a,r[i++]=o,r[i++]=s}let a=new Hn;a.setAttribute(`position`,new On(e,3)),a.setAttribute(`color`,new On(t,3)),a.setAttribute(`aMatA`,new On(ff,4)),a.setAttribute(`aMatB`,new On(pf,4)),a.setIndex(new On(r,1)),a.computeVertexNormals();let o=new co({vertexColors:!0,roughness:.96,metalness:0});o.onBeforeCompile=xf;let s=new G(a,o);s.receiveShadow=!0,s.name=`terrain`;let c=new Float32Array(315844);for(let e=0;e<78961;e++)c[e*4]=uf[e],c[e*4+1]=df[e],c[e*4+2]=hf[e],c[e*4+3]=1;let l=new Or(c,281,281,_,f);l.needsUpdate=!0;let u=new Float32Array(315844);for(let e=0;e<78961;e++)u[e*4]=t[e*3],u[e*4+1]=t[e*3+1],u[e*4+2]=t[e*3+2],u[e*4+3]=1;let d=new Or(u,281,281,_,f);return d.needsUpdate=!0,{mesh:s,heightTex:l,colorTex:d}}function Cf(e,t){let n=Id(Math.round((e+700)/5),0,280);return df[Id(Math.round((t+700)/5),0,280)*281+n]}function wf(e){let t=[],n=[],r=[],i=new Int32Array(78961).fill(-1),a=e=>{if(i[e]>=0)return i[e];let r=e%281,a=Math.floor(e/281);return i[e]=t.length/3,t.push(-700+r*5,Hd,-700+a*5),n.push(Hd-uf[e]),i[e]};for(let e=0;e<280;e++)for(let t=0;t<280;t++){let n=e*281+t,i=(e+1)*281+t,o=(e+1)*281+t+1,s=e*281+t+1;if(Math.min(uf[n],uf[i],uf[o],uf[s])>.8)continue;let c=a(n),l=a(i),u=a(o),d=a(s);r.push(c,l,d,l,u,d)}let o=new Hn;o.setAttribute(`position`,new W(t,3)),o.setAttribute(`aDepth`,new W(n,1)),o.setIndex(r);let s=new G(o,new oo({transparent:!0,fog:!0,uniforms:ro.merge([K.fog,{uTime:e.uTime,uShallow:{value:new U(`#3fa7a2`)},uDeep:{value:new U(`#174c6e`)},uSky:{value:new U(`#cfe3f0`)},uSunDir:{value:new V(0,1,0)},uSunColor:{value:new U(`#ffffff`)},uLight:{value:1}}]),vertexShader:`
      #include <fog_pars_vertex>
      attribute float aDepth;
      varying float vDepth;
      varying vec3 vWPos;
      void main(){
        vDepth = aDepth;
        vec4 wp = modelMatrix * vec4(position,1.0);
        vWPos = wp.xyz;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,fragmentShader:`
      #include <common>
      #include <fog_pars_fragment>
      uniform float uTime; uniform vec3 uShallow; uniform vec3 uDeep; uniform vec3 uSky;
      uniform vec3 uSunDir; uniform vec3 uSunColor; uniform float uLight;
      varying float vDepth; varying vec3 vWPos;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(41.3,289.1)))*43758.5453); }
      float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(h2(i),h2(i+vec2(1,0)),f.x), mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x), f.y); }
      void main(){
        vec2 p = vWPos.xz;
        float t = uTime;
        float n1 = vn(p*0.35 + vec2(t*0.35, t*0.2));
        float n2 = vn(p*0.7 - vec2(t*0.25, -t*0.3));
        float n3 = vn(p*0.12 + vec2(t*0.05));
        vec3 nrm = normalize(vec3((n1-0.5)*0.5 + (n2-0.5)*0.4, 1.0, (n2-0.5)*0.5 - (n1-0.5)*0.3));
        vec3 V = normalize(cameraPosition - vWPos);
        float fres = pow(1.0 - max(dot(V, nrm), 0.0), 3.0);
        float d = clamp(vDepth/3.5, 0.0, 1.0);
        vec3 col = mix(uShallow, uDeep, d) * uLight;
        col = mix(col, uSky, 0.08 + fres*0.5);
        vec3 H = normalize(uSunDir + V);
        float spec = pow(max(dot(nrm, H), 0.0), 180.0);
        col += uSunColor * spec * 3.0;
        // foam at the shoreline
        float foam = smoothstep(0.35, 0.0, vDepth + (n1-0.5)*0.25 + sin(t*1.5 + n3*6.0)*0.06);
        col = mix(col, vec3(0.95)*max(uLight,0.15), foam*0.6);
        float a = mix(0.8, 0.96, d);
        a = max(a, foam*0.9);
        a *= smoothstep(-0.05, 0.12, vDepth);
        gl_FragColor = vec4(col, a);
        #include <fog_fragment>
      }`}));return s.renderOrder=2,s.name=`water`,s}function Tf(e,t,n){let r=Math.cos(-e.rot),i=Math.sin(-e.rot);return[e.x+t*r+n*i,e.z-t*i+n*r]}var Ef=[{t:0,top:`#070b1f`,hor:`#18203f`,fog:`#10162c`,sun:`#8aa4ff`,sunI:.35,hemiS:`#3b4a82`,hemiG:`#0d0f1a`,hemiI:.35,cloud:`#232b4a`},{t:.19,top:`#0e1533`,hor:`#2a2b52`,fog:`#1b1d38`,sun:`#8aa4ff`,sunI:.3,hemiS:`#3b4a82`,hemiG:`#141522`,hemiI:.35,cloud:`#2d3257`},{t:.235,top:`#2d3c72`,hor:`#f0946a`,fog:`#b9807a`,sun:`#ff9a5c`,sunI:1.2,hemiS:`#8d8fbf`,hemiG:`#4a3a32`,hemiI:.6,cloud:`#f3a07c`},{t:.29,top:`#4d86c6`,hor:`#f7cf9c`,fog:`#dcc7a6`,sun:`#ffd6a0`,sunI:2.6,hemiS:`#a9c4e8`,hemiG:`#6b5a3e`,hemiI:.9,cloud:`#fff0dc`},{t:.4,top:`#3f7bd0`,hor:`#cfe2f0`,fog:`#c4d6e2`,sun:`#fff4e4`,sunI:3.2,hemiS:`#b8d4f5`,hemiG:`#7a6a48`,hemiI:1,cloud:`#ffffff`},{t:.6,top:`#3f7bd0`,hor:`#d4e3ee`,fog:`#c8d7e0`,sun:`#fff1dc`,sunI:3.2,hemiS:`#b8d4f5`,hemiG:`#7a6a48`,hemiI:1,cloud:`#ffffff`},{t:.7,top:`#4a6fb3`,hor:`#f6c47e`,fog:`#e2bd8c`,sun:`#ffc27a`,sunI:2.8,hemiS:`#a8b9dc`,hemiG:`#6f5335`,hemiI:.9,cloud:`#ffe2b8`},{t:.755,top:`#35407e`,hor:`#f2794a`,fog:`#c8735c`,sun:`#ff7a45`,sunI:1.6,hemiS:`#8b86b5`,hemiG:`#4d3528`,hemiI:.65,cloud:`#ff9a74`},{t:.8,top:`#151b40`,hor:`#5d3c6c`,fog:`#3b2d4f`,sun:`#9a86ff`,sunI:.4,hemiS:`#4b4a86`,hemiG:`#1a1520`,hemiI:.4,cloud:`#51406a`},{t:.86,top:`#070b1f`,hor:`#1c2244`,fog:`#10162c`,sun:`#8aa4ff`,sunI:.35,hemiS:`#3b4a82`,hemiG:`#0d0f1a`,hemiI:.35,cloud:`#232b4a`},{t:1,top:`#070b1f`,hor:`#18203f`,fog:`#10162c`,sun:`#8aa4ff`,sunI:.35,hemiS:`#3b4a82`,hemiG:`#0d0f1a`,hemiI:.35,cloud:`#232b4a`}],Df=[`top`,`hor`,`fog`,`sun`,`hemiS`,`hemiG`,`cloud`];for(let e of Ef)for(let t of Df)e[t]=new U(e[t]);var Of=class{constructor(e){this.scene=e,this.t=.3,this.dayLength=1200,this.state={};for(let e of Df)this.state[e]=new U;this.sunDir=new V,this.lightDir=new V,this.night=0,this.uniforms={uTop:{value:this.state.top},uHor:{value:this.state.hor},uSunDir:{value:this.sunDir},uSunCol:{value:this.state.sun},uCloud:{value:this.state.cloud},uNight:{value:0},uTime:{value:0}};let t=new Ja(4e3,48,24),n=new oo({side:1,depthWrite:!1,fog:!1,uniforms:this.uniforms,vertexShader:`
        varying vec3 vDir;
        void main(){
          vDir = normalize(position);
          vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0);
          gl_Position = p.xyww;
        }`,fragmentShader:`
        uniform vec3 uTop, uHor, uSunDir, uSunCol, uCloud; uniform float uNight, uTime;
        varying vec3 vDir;
        float h3(vec3 p){ p = fract(p*0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
        float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
        float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
          return mix(mix(h2(i),h2(i+vec2(1,0)),f.x), mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x), f.y); }
        float fbm(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<5;i++){ s+=a*vn(p); p*=2.03; a*=0.5; } return s; }
        void main(){
          vec3 d = normalize(vDir);
          float y = d.y;
          vec3 col = mix(uHor, uTop, pow(clamp(y,0.0,1.0), 0.55));
          // horizon glow toward the sun
          float sd = max(dot(d, uSunDir), 0.0);
          float sunUp = smoothstep(-0.25, 0.1, uSunDir.y);
          col += uSunCol * pow(sd, 6.0) * 0.35 * sunUp * (1.0 - clamp(y,0.0,1.0));
          col += uSunCol * pow(sd, 64.0) * 0.6 * sunUp;
          // sun disk
          col += uSunCol * smoothstep(0.9993, 0.9997, sd) * 12.0 * sunUp * (1.0-uNight);
          // below horizon
          col = mix(col, uHor*0.6, smoothstep(0.0, -0.15, y));

          // stars + milky way
          if (uNight > 0.01 && y > -0.05) {
            vec3 sp = d * 380.0;
            vec3 cell = floor(sp);
            float r = h3(cell);
            float star = step(0.9965, r) * smoothstep(0.55, 0.0, length(fract(sp)-0.5));
            float tw = 0.6 + 0.4*sin(uTime*3.0 + r*300.0);
            vec3 band = normalize(vec3(0.4, 0.75, -0.53));
            float mw = exp(-pow(dot(d, band), 2.0) * 22.0);
            float mwn = fbm(vec2(atan(d.z, d.x)*4.0, d.y*6.0) + 3.0);
            vec3 mwc = mix(vec3(0.35,0.3,0.55), vec3(0.95,0.8,0.7), mwn) * mw * mwn * 0.55;
            float dense = step(0.985 - mw*0.02, h3(cell*1.7+3.1)) * smoothstep(0.5,0.0,length(fract(sp*1.7)-0.5)) * mw;
            col += (vec3(star*tw*2.2) + mwc + dense*0.8) * uNight * smoothstep(-0.05, 0.25, y);
            // moon, opposite the sun
            float md = dot(d, -uSunDir);
            col += vec3(0.9,0.93,1.0) * smoothstep(0.9990, 0.9994, md) * 3.0 * uNight;
            col += vec3(0.3,0.35,0.5) * pow(max(md,0.0), 200.0) * uNight;
          }

          // clouds
          if (y > 0.0) {
            vec2 uv = d.xz / (y + 0.12) * 1.3;
            uv += vec2(uTime*0.004, uTime*0.002);
            float c = fbm(uv*1.1);
            c = smoothstep(0.56, 0.82, c);
            float lit = 0.75 + 0.25*sd;
            vec3 cc = mix(uCloud*0.75, uCloud*1.15, lit) + uSunCol*pow(sd,8.0)*0.4*sunUp;
            col = mix(col, cc, c * smoothstep(0.0, 0.18, y) * 0.9);
          }
          gl_FragColor = vec4(col, 1.0);
        }`});this.mesh=new G(t,n),this.mesh.frustumCulled=!1,this.mesh.renderOrder=-1,e.add(this.mesh),this.sun=new _s(16777215,3),this.sun.castShadow=!0,this.sun.shadow.mapSize.set(2048,2048);let r=this.sun.shadow.camera;r.left=-70,r.right=70,r.top=70,r.bottom=-70,r.near=1,r.far=400,this.sun.shadow.bias=-4e-4,this.sun.shadow.normalBias=.04,e.add(this.sun,this.sun.target),this.hemi=new Qo(16777215,4473924,1),e.add(this.hemi),e.fog=new qt(13421772,.0022),this.update(0,new V)}get hours(){return this.t*24%24}update(e,t){this.t=(this.t+e/this.dayLength)%1,this.uniforms.uTime.value+=e;let n=Ef[0],r=Ef[1];for(let e=0;e<Ef.length-1;e++)if(this.t>=Ef[e].t&&this.t<=Ef[e+1].t){n=Ef[e],r=Ef[e+1];break}let i=(this.t-n.t)/(r.t-n.t);for(let e of Df)this.state[e].copy(n[e]).lerp(r[e],i);let a=Ld(n.sunI,r.sunI,i),o=Ld(n.hemiI,r.hemiI,i),s=(this.t-.25)*Math.PI*2;this.sunDir.set(Math.cos(s)*.85,Math.sin(s),.4).normalize(),this.night=Id((-this.sunDir.y+.05)/.2,0,1),this.uniforms.uNight.value=this.night,this.lightDir.copy(this.sunDir),this.sunDir.y<.02&&this.lightDir.negate(),this.lightDir.y<.12&&(this.lightDir.y=.12),this.lightDir.normalize(),this.sun.color.copy(this.state.sun),this.sun.intensity=a,this.sun.position.copy(t).addScaledVector(this.lightDir,200),this.sun.target.position.copy(t),this.hemi.color.copy(this.state.hemiS),this.hemi.groundColor.copy(this.state.hemiG),this.hemi.intensity=o,this.scene.fog.color.copy(this.state.fog),this.mesh.position.copy(t)}};function kf(e,t=!1){let n=e[0].index!==null,r=new Set(Object.keys(e[0].attributes)),i=new Set(Object.keys(e[0].morphAttributes)),a={},o={},s=e[0].morphTargetsRelative,c=new Hn,l=0;for(let u=0;u<e.length;++u){let d=e[u],f=0;if(n!==(d.index!==null))return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them.`),null;for(let e in d.attributes){if(!r.has(e))return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. All geometries must have compatible attributes; make sure "`+e+`" attribute exists among all geometries, or in none of them.`),null;a[e]===void 0&&(a[e]=[]),a[e].push(d.attributes[e]),f++}if(f!==r.size)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. Make sure all geometries have the same number of attributes.`),null;if(s!==d.morphTargetsRelative)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. .morphTargetsRelative must be consistent throughout all geometries.`),null;for(let e in d.morphAttributes){if(!i.has(e))return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`.  .morphAttributes must be consistent throughout all geometries.`),null;o[e]===void 0&&(o[e]=[]),o[e].push(d.morphAttributes[e])}if(t){let e;if(n)e=d.index.count;else if(d.attributes.position!==void 0)e=d.attributes.position.count;else return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. The geometry must have either an index or a position attribute`),null;c.addGroup(l,e,u),l+=e}}if(n){let t=0,n=[];for(let r=0;r<e.length;++r){let i=e[r].index;for(let e=0;e<i.count;++e)n.push(i.getX(e)+t);t+=e[r].attributes.position.count}c.setIndex(n)}for(let e in a){let t=Af(a[e]);if(!t)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the `+e+` attribute.`),null;c.setAttribute(e,t)}for(let e in o){let t=o[e][0].length;if(t!==0){c.morphAttributes=c.morphAttributes||{},c.morphAttributes[e]=[];for(let n=0;n<t;++n){let t=[];for(let r=0;r<o[e].length;++r)t.push(o[e][r][n]);let r=Af(t);if(!r)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the `+e+` morphAttribute.`),null;c.morphAttributes[e].push(r)}}}return c}function Af(e){let t,n,r,i=-1,a=0;for(let o=0;o<e.length;++o){let s=e[o];if(t===void 0&&(t=s.array.constructor),t!==s.array.constructor)return console.error(`THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes.`),null;if(n===void 0&&(n=s.itemSize),n!==s.itemSize)return console.error(`THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes.`),null;if(r===void 0&&(r=s.normalized),r!==s.normalized)return console.error(`THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes.`),null;if(i===-1&&(i=s.gpuType),i!==s.gpuType)return console.error(`THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes.`),null;a+=s.count*n}let o=new t(a),s=new On(o,n,r),c=0;for(let t=0;t<e.length;++t){let r=e[t];if(r.isInterleavedBufferAttribute){let e=c/n;for(let t=0,i=r.count;t<i;t++)for(let i=0;i<n;i++){let n=r.getComponent(t,i);s.setComponent(t+e,i,n)}}else o.set(r.array,c);c+=r.count*n}return i!==void 0&&(s.gpuType=i),s}function jf(e,t){if(t===0)return console.warn(`THREE.BufferGeometryUtils.toTrianglesDrawMode(): Geometry already defined as triangles.`),e;if(t===2||t===1){let n=e.getIndex();if(n===null){let t=[],r=e.getAttribute(`position`);if(r!==void 0){for(let e=0;e<r.count;e++)t.push(e);e.setIndex(t),n=e.getIndex()}else return console.error(`THREE.BufferGeometryUtils.toTrianglesDrawMode(): Undefined position attribute. Processing not possible.`),e}let r=n.count-2,i=[];if(t===2)for(let e=1;e<=r;e++)i.push(n.getX(0)),i.push(n.getX(e)),i.push(n.getX(e+1));else for(let e=0;e<r;e++)e%2==0?(i.push(n.getX(e)),i.push(n.getX(e+1)),i.push(n.getX(e+2))):(i.push(n.getX(e+2)),i.push(n.getX(e+1)),i.push(n.getX(e)));return i.length/3!==r&&console.error(`THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unable to generate correct amount of triangles.`),e.setIndex(i),e.clearGroups(),e}return console.error(`THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unknown draw mode:`,t),e}function Mf(e,t){let n=document.createElement(`canvas`);return n.width=e,n.height=t,[n,n.getContext(`2d`)]}function Nf(t,n=!0){let r=new pi(t);return r.colorSpace=N,n&&(r.wrapS=r.wrapT=e),r.anisotropy=8,r}function Pf(e=1,t=!1){let n=Bd(e),[r,i]=Mf(256,256);i.fillStyle=`#d8d0c4`,i.fillRect(0,0,256,256);for(let e=0;e<8;e++){let t=180+Math.floor(n()*60);i.fillStyle=`rgb(${t},${t-8},${t-18})`,i.fillRect(0,e*32+1,256,30);for(let t=0;t<14;t++){i.strokeStyle=`rgba(80,60,40,${.08+n()*.12})`,i.lineWidth=.5+n(),i.beginPath();let t=e*32+n()*32;i.moveTo(0,t),i.bezierCurveTo(80,t+(n()-.5)*6,170,t+(n()-.5)*6,256,t+(n()-.5)*4),i.stroke()}n()>.5&&(i.fillStyle=`rgba(70,50,30,0.35)`,i.beginPath(),i.ellipse(n()*256,e*32+16,5,2.5,0,0,7),i.fill()),i.fillStyle=`rgba(40,30,25,0.6)`;let r=Math.floor(n()*4)*64+8;i.fillRect(r,e*32+5,2,2),i.fillRect(r,e*32+32-7,2,2),i.fillStyle=`rgba(40,28,18,0.8)`,i.fillRect(0,e*32,256,1.5);let a=Math.floor(n()*256);i.fillRect(a,e*32,1.5,32)}if(t){let[e,t]=Mf(256,256);return t.translate(128,128),t.rotate(Math.PI/2),t.drawImage(r,-128,-128),Nf(e)}return Nf(r)}function Ff(e=3){let t=Bd(e),[n,r]=Mf(256,256);r.fillStyle=`#a89c90`,r.fillRect(0,0,256,256);let i=256/10;for(let e=0;e<10;e++){let n=e%2*-12;for(;n<256;){let a=18+t()*16,o=150+Math.floor(t()*70);r.fillStyle=`rgb(${o},${o-10},${o-20})`,r.fillRect(n+1,e*i,a-2,27.6),r.fillStyle=`rgba(30,20,15,0.45)`,r.fillRect(n+1,e*i+i-3,a-2,3),n+=a}}return Nf(n)}function If(){let[e,t]=Mf(128,128);t.fillStyle=`#b5b5b5`,t.fillRect(0,0,128,128);for(let e=0;e<128;e+=16)t.fillStyle=`rgba(0,0,0,0.25)`,t.fillRect(e,0,2,128),t.fillStyle=`rgba(255,255,255,0.3)`,t.fillRect(e+3,0,1,128);let n=Bd(8);for(let e=0;e<40;e++)t.fillStyle=`rgba(120,60,20,${n()*.2})`,t.beginPath(),t.arc(n()*128,n()*128,n()*8,0,7),t.fill();return Nf(e)}function Lf(e,{w:t=512,h:n=128,bg:r=`#3d2a1c`,fg:i=`#f1e3c3`,font:a=`Rye`,size:o=72,border:s=!0,sub:c=null}={}){let[l,u]=Mf(t,n);u.fillStyle=r,u.fillRect(0,0,t,n);let d=Bd(e.length*31+t);for(let e=0;e<40;e++){u.strokeStyle=`rgba(0,0,0,${.05+d()*.1})`,u.beginPath();let e=d()*n;u.moveTo(0,e),u.lineTo(t,e+(d()-.5)*8),u.stroke()}s&&(u.strokeStyle=i,u.globalAlpha=.7,u.lineWidth=5,u.strokeRect(12,12,t-24,n-24),u.globalAlpha=1),u.fillStyle=i,u.textAlign=`center`,u.textBaseline=`middle`;let f=e.split(`
`),p=Math.min(o,(n-30)/f.length/(c?1.3:1));u.font=`${p}px "${a}", Georgia, serif`,f.forEach((e,r)=>{let i=n/2+(r-(f.length-1)/2)*p*1.1-(c?p*.25:0),o=u.measureText(e).width,s=t-50;o>s&&(u.font=`${p*s/o}px "${a}", Georgia, serif`),u.fillText(e,t/2,i),u.font=`${p}px "${a}", Georgia, serif`}),c&&(u.font=`${p*.38}px "${a}", Georgia, serif`,u.fillText(c,t/2,n-32));for(let e=0;e<400;e++)u.fillStyle=`rgba(${d()>.5?`0,0,0`:`255,240,220`},${d()*.08})`,u.fillRect(d()*t,d()*n,d()*4,d()*4);return Nf(l,!1)}function Rf(){let[e,t]=Mf(64,96);return t.fillStyle=`#2a2018`,t.fillRect(0,0,64,96),t.fillStyle=`#ffffff`,t.fillRect(5,5,54,86),t.fillStyle=`#2a2018`,t.fillRect(30,5,4,86),t.fillRect(5,45,54,4),Nf(e,!1)}function zf(){let e=Bd(12),[t,n]=Mf(256,128);n.fillStyle=`#f2ede4`,n.fillRect(0,0,256,128),n.fillStyle=`#1e1a18`;for(let t=0;t<9;t++){let t=e()*256,r=e()*128,i=12+e()*26;n.beginPath();for(let a=0;a<6.28;a+=.5){let o=i*(.7+e()*.5);n.lineTo(t+Math.cos(a)*o,r+Math.sin(a)*o*.8)}n.fill()}return Nf(t)}function Bf(e,t,n,r,i,a){for(let o=0;o<i;o++){let i=r()*t,o=r()*n,s=2+r()*18,c=e.createRadialGradient(i,o,0,i,o,s),l=a(r);c.addColorStop(0,l),c.addColorStop(1,`rgba(0,0,0,0)`),e.fillStyle=c,e.fillRect(i-s,o-s,s*2,s*2)}}function Vf(){let t=Bd(51),[n,r]=Mf(512,512),i=r.createLinearGradient(0,0,0,512);i.addColorStop(0,`#6f8a52`),i.addColorStop(.45,`#90a669`),i.addColorStop(1,`#a3b27a`),r.fillStyle=i,r.fillRect(0,0,512,512),Bf(r,512,512,t,900,e=>e()>.5?`rgba(70,95,50,${.08+e()*.1})`:`rgba(190,200,140,${.05+e()*.08})`);for(let e=0;e<260;e++){let e=t()**1.8*512*.55;r.fillStyle=`rgba(55,75,40,${.15+t()*.2})`,r.beginPath(),r.arc(t()*512,e,.8+t()*2.2,0,7),r.fill()}let[a,o]=Mf(512,512);o.fillStyle=`#808080`,o.fillRect(0,0,512,512);for(let e=0;e<9e3;e++)o.fillStyle=`rgba(${t()>.5?`255,255,255`:`0,0,0`},${.05+t()*.08})`,o.fillRect(t()*512,t()*512,1+t()*2,1+t()*2);o.strokeStyle=`rgba(0,0,0,0.12)`;for(let e=0;e<120;e++){o.lineWidth=.5+t(),o.beginPath();let e=t()*512,n=t()*512;o.moveTo(e,n),o.quadraticCurveTo(e+(t()-.5)*30,n+(t()-.5)*8,e+(t()-.5)*50,n+(t()-.5)*10),o.stroke()}let s=Nf(n),c=new pi(a);return c.wrapS=c.wrapT=e,{map:s,bump:c}}function Hf(t,n){let r=Bd(t.length*97),[i,a]=Mf(256,256),[o,s]=Mf(256,256);if(a.fillStyle=n,a.fillRect(0,0,256,256),s.fillStyle=`#808080`,s.fillRect(0,0,256,256),t===`leather`){Bf(a,256,256,r,300,e=>`rgba(${e()>.5?`255,235,210`:`20,10,0`},${.04+e()*.07})`);for(let e=0;e<40;e++){a.strokeStyle=`rgba(255,240,220,${.05+r()*.08})`,a.lineWidth=.5+r()*1.5,a.beginPath();let e=r()*256,t=r()*256;a.moveTo(e,t),a.lineTo(e+(r()-.5)*40,t+(r()-.5)*20),a.stroke()}for(let e=0;e<5e3;e++)s.fillStyle=`rgba(0,0,0,${r()*.12})`,s.fillRect(r()*256,r()*256,2,2)}else{let e=t===`canvas`?3:2;for(let t=0;t<256;t+=e)a.fillStyle=`rgba(0,0,0,${.03+r()*.04})`,a.fillRect(0,t,256,1),s.fillStyle=`rgba(0,0,0,0.25)`,s.fillRect(0,t,256,1);for(let t=0;t<256;t+=e)a.fillStyle=`rgba(255,255,255,${.03+r()*.03})`,a.fillRect(t,0,1,256),s.fillStyle=`rgba(255,255,255,0.2)`,s.fillRect(t,0,1,256);if(t===`denim`){a.strokeStyle=`rgba(255,255,255,0.05)`;for(let e=-256;e<256;e+=3)a.beginPath(),a.moveTo(e,0),a.lineTo(e+256,256),a.stroke()}Bf(a,256,256,r,120,e=>`rgba(${e()>.6?`255,250,235`:`60,40,20`},${.03+e()*.05})`)}for(let e=0;e<26;e++){let e=r()*256,t=s.createLinearGradient(e-8,0,e+8,0);t.addColorStop(0,`rgba(0,0,0,0)`),t.addColorStop(.5,`rgba(${r()>.5?`0,0,0`:`255,255,255`},0.18)`),t.addColorStop(1,`rgba(0,0,0,0)`),s.fillStyle=t,s.fillRect(e-8,r()*256*.5,16,256*(.3+r()*.5))}let c=Nf(i),l=new pi(o);return l.wrapS=l.wrapT=e,{map:c,bump:l}}function Uf(){let[e,t]=Mf(256,256),n=[`#b8322a`,`#e8d6b0`,`#2a6a7a`,`#e8a23a`,`#b8322a`,`#3a2a22`,`#e8d6b0`,`#c0582a`],r=0,i=Bd(9);for(;r<256;){let e=6+Math.floor(i()*22);if(t.fillStyle=n[Math.floor(i()*n.length)],t.fillRect(0,r,256,e),e>16){t.fillStyle=`rgba(245,235,215,0.8)`;for(let n=0;n<256;n+=12)t.beginPath(),t.moveTo(n,r+e/2),t.lineTo(n+6,r+3),t.lineTo(n+12,r+e/2),t.lineTo(n+6,r+e-3),t.fill()}r+=e}for(let e=0;e<3e3;e++)t.fillStyle=`rgba(0,0,0,${i()*.08})`,t.fillRect(i()*256,i()*256,1,2);return Nf(e)}function Wf(){let[e,t]=Mf(128,128);t.fillStyle=`#a8282a`,t.fillRect(0,0,128,128);let n=Bd(4);for(let e=0;e<70;e++){let e=n()*128,r=n()*128;t.fillStyle=`rgba(245,235,220,0.85)`,t.beginPath(),t.ellipse(e,r,3,1.6,n()*3,0,7),t.fill(),t.fillStyle=`rgba(20,10,10,0.6)`,t.beginPath(),t.arc(e+3,r+2,.9,0,7),t.fill()}return t.strokeStyle=`rgba(245,235,220,0.7)`,t.lineWidth=2,t.strokeRect(4,4,120,120),Nf(e)}function Gf(e=`broad`){let n=Bd(e===`pine`?11:e===`sage`?13:7),[r,i]=Mf(256,256);if(i.clearRect(0,0,256,256),e===`pine`){i.strokeStyle=`#6a5a40`,i.lineWidth=3,i.beginPath(),i.moveTo(8,128),i.quadraticCurveTo(128,110,246,138),i.stroke();for(let e=0;e<520;e++){let e=n(),t=8+e*238,r=128-72*e*(1-e)+10*e*e,a=(n()-.5)*2.6+(n()>.5?Math.PI/2:-Math.PI/2)*.8,o=(1-Math.abs(e-.45))*46*(.5+n()*.6),s=150+Math.floor(n()*90);i.strokeStyle=`rgb(${s*.55|0},${s},${s*.6|0})`,i.lineWidth=1.2+n(),i.beginPath(),i.moveTo(t,r),i.lineTo(t+Math.cos(a)*o,r+Math.sin(a)*o),i.stroke()}}else{let t=e===`sage`?90:70;for(let r=0;r<t;r++){let t=n()*Math.PI*2,r=Math.sqrt(n())*256*.36,a=128+Math.cos(t)*r,o=128+Math.sin(t)*r,s=e===`sage`?10+n()*8:16+n()*14,c=e===`sage`?s*.3:s*.55,l=160+Math.floor(n()*95);i.save(),i.translate(a,o),i.rotate(n()*Math.PI*2),i.fillStyle=`rgb(${l*.72|0},${l},${l*.5|0})`,i.beginPath(),i.moveTo(0,-s/2),i.quadraticCurveTo(c,-s*.1,0,s/2),i.quadraticCurveTo(-c,-s*.1,0,-s/2),i.fill(),i.strokeStyle=`rgba(40,60,20,0.35)`,i.lineWidth=.8,i.beginPath(),i.moveTo(0,-s/2),i.lineTo(0,s/2),i.stroke(),i.restore()}}let a=Nf(r);return a.wrapS=a.wrapT=t,a}function Kf(){let e=Bd(21),[t,n]=Mf(128,256);n.fillStyle=`#8a7a68`,n.fillRect(0,0,128,256);for(let t=0;t<90;t++){let t=e()*128;n.strokeStyle=`rgba(${e()>.5?`40,30,20`:`200,190,170`},${.2+e()*.3})`,n.lineWidth=1+e()*3,n.beginPath(),n.moveTo(t,0);let r=0,i=t;for(;r<256;)r+=10+e()*20,i+=(e()-.5)*8,n.lineTo(i,r);n.stroke()}return Nf(t)}var qf=`
vec2 windOffset(vec3 wp, float t){
  float w = sin(t*1.3 + wp.x*0.09 + wp.z*0.05)*0.6 + sin(t*2.3 + wp.x*0.21 - wp.z*0.13)*0.25 + 0.35;
  return vec2(0.8, 0.45) * w;
}`;function Jf(e,t,{sway:n=.02,flutter:r=.04,start:i=1.5}={}){let a=new co({map:e,alphaTest:.45,side:2,vertexColors:!0,roughness:.82});return a.onBeforeCompile=e=>{Object.assign(e.uniforms,t),e.vertexShader=e.vertexShader.replace(`#include <common>`,`#include <common>\nuniform float uTime;\n${qf}`).replace(`#include <project_vertex>`,`
        vec4 mvPosition = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          mvPosition = instanceMatrix * mvPosition;
        #endif
        mvPosition = modelMatrix * mvPosition;
        float hh = max(transformed.y - ${i.toFixed(2)}, 0.0);
        mvPosition.xz += windOffset(mvPosition.xyz, uTime) * hh * ${n.toFixed(4)};
        float fl = sin(uTime * 4.0 + dot(mvPosition.xyz, vec3(1.7, 2.3, 1.3))) * ${r.toFixed(3)};
        mvPosition.xyz += vec3(fl, fl * 0.6, -fl) * step(0.001, hh);
        mvPosition = viewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;`),e.fragmentShader=e.fragmentShader.replace(`#include <common>`,`#include <common>
uniform vec3 uSunDir; uniform vec3 uSunCol;`).replace(`#include <opaque_fragment>`,`
        vec3 sunV = normalize((viewMatrix * vec4(uSunDir, 0.0)).xyz);
        float back = pow(max(dot(-normalize(vViewPosition), sunV), 0.0), 3.0);
        outgoingLight += diffuseColor.rgb * uSunCol * back * 0.75;
        #include <opaque_fragment>`)},a}function Yf(e){return new uo({depthPacking:3201,map:e,alphaTest:.45})}var Xf;function Zf(){if(!Xf){let e=Kf();e.repeat.set(2,1),Xf=new co({map:e,vertexColors:!0,roughness:.95})}return Xf}function Qf(e,t,n,r=6,i=new U(`#ffffff`)){let a=new Ni(e),o=a.getLength(),s=Math.max(2,Math.round(o*2.2)),c=a.computeFrenetFrames(s,!1),l=[],u=[],d=[],f=[],p=[];for(let e=0;e<=s;e++){let m=e/s,h=a.getPointAt(m),g=Ld(t,n,m**.8),_=c.normals[e],v=c.binormals[e];for(let e=0;e<=r;e++){let t=e/r*Math.PI*2,n=_.clone().multiplyScalar(Math.cos(t)).addScaledVector(v,Math.sin(t));l.push(h.x+n.x*g,h.y+n.y*g,h.z+n.z*g),u.push(n.x,n.y,n.z),d.push(e/r,m*o/1.6);let a=.75+.25*m;f.push(i.r*a,i.g*a,i.b*a)}if(e<s)for(let t=0;t<r;t++){let n=e*(r+1)+t,i=n+r+1;p.push(n,i,n+1,n+1,i,i+1)}}let m=new Hn;return m.setAttribute(`position`,new W(l,3)),m.setAttribute(`normal`,new W(u,3)),m.setAttribute(`uv`,new W(d,2)),m.setAttribute(`color`,new W(f,3)),m.setIndex(p),m}var $f=class{constructor(){this.pos=[],this.nrm=[],this.uv=[],this.col=[],this.idx=[]}add(e,t,n,r,i,a,o){let s=this.pos.length/3,c=t.clone().multiplyScalar(r/2),l=n.clone().multiplyScalar(i/2);for(let[t,n,r,i]of[[-1,-1,0,0],[1,-1,1,0],[1,1,1,1],[-1,1,0,1]]){let s=e.clone().addScaledVector(c,t).addScaledVector(l,n);this.pos.push(s.x,s.y,s.z);let u=o(s);this.nrm.push(u.x,u.y,u.z),this.uv.push(r,i),this.col.push(a.r,a.g,a.b)}this.idx.push(s,s+1,s+2,s,s+2,s+3)}build(){let e=new Hn;return e.setAttribute(`position`,new W(this.pos,3)),e.setAttribute(`normal`,new W(this.nrm,3)),e.setAttribute(`uv`,new W(this.uv,2)),e.setAttribute(`color`,new W(this.col,3)),e.setIndex(this.idx),e}};function ep(e){let t=e()*Math.PI*2,n=e()*2-1,r=Math.sqrt(1-n*n);return new V(Math.cos(t)*r,n,Math.sin(t)*r)}function tp(e,t){let n=new V().crossVectors(e,Math.abs(e.y)<.9?new V(0,1,0):new V(1,0,0)).normalize(),r=new V().crossVectors(e,n).normalize(),i=t()*Math.PI*2;return[n.clone().multiplyScalar(Math.cos(i)).addScaledVector(r,Math.sin(i)),r.clone().multiplyScalar(Math.cos(i)).addScaledVector(n,-Math.sin(i))]}function np(e){let t=Bd(e*131+7),n=[],r=new U(`#8a7a68`),i=3.2+t()*1.4,a=new V((t()-.5)*.6,0,(t()-.5)*.6),o=[new V(0,-.3,0),new V(a.x*.3,i*.45,a.z*.3),new V(a.x,i,a.z)];n.push(Qf(o,.42+t()*.1,.22,9,r));for(let e=0;e<4;e++){let i=e/4*Math.PI*2+t();n.push(Qf([new V(Math.cos(i)*.15,.6,Math.sin(i)*.15),new V(Math.cos(i)*.45,.1,Math.sin(i)*.45),new V(Math.cos(i)*.7,-.15,Math.sin(i)*.7)],.16,.05,5,r))}let s=[],c=o[2],l=4+Math.floor(t()*3);for(let e=0;e<l;e++){let i=e/l*Math.PI*2+t()*.8,a=.55+t()*.5,u=2.4+t()*1.6,d=new V(Math.cos(i)*Math.cos(a),Math.sin(a),Math.sin(i)*Math.cos(a)),f=c.clone().lerp(o[1],t()*.45),p=f.clone().addScaledVector(d,u*.5);p.y+=.25;let m=f.clone().addScaledVector(d,u);m.y+=.55+t()*.4,n.push(Qf([f,p,m],.16,.045,6,r)),s.push({c:m.clone(),s:1+t()*.35},{c:p.clone().add(new V(0,.35,0)),s:.8});for(let e=0;e<2;e++){let e=d.clone().applyAxisAngle(new V(0,1,0),(t()-.5)*1.8);e.y+=.3+t()*.4,e.normalize();let i=f.clone().lerp(m,.45+t()*.3),a=i.clone().addScaledVector(e,1.1+t()*1);n.push(Qf([i,i.clone().lerp(a,.5).add(new V(0,.15,0)),a],.06,.02,4,r)),s.push({c:a,s:.8+t()*.3})}}s.push({c:c.clone().add(new V(0,1.4,0)),s:1.2});let u=s.reduce((e,t)=>e.add(t.c),new V).multiplyScalar(1/s.length),d=Math.max(...s.map(e=>e.c.distanceTo(u)))+1,f=new $f,p=new U;for(let e of s){let n=Math.round(17*e.s),r=t();for(let i=0;i<n;i++){let n=e.c.clone().addScaledVector(ep(t),Math.cbrt(t())*1.15*e.s),i=n.clone().sub(u),[a,o]=tp(ep(t).lerp(i.clone().normalize(),.5).normalize(),t),s=(1.2+t()*.7)*e.s,c=Id(i.length()/d,0,1),l=Id(i.y/d*.5+.5,0,1),m=.45+c*.4+l*.25;p.setRGB(.62+r*.12,.78+r*.08,.42+r*.05).multiplyScalar(m),f.add(n,a,o,s,s,p,e=>e.clone().sub(u).normalize().lerp(new V(0,1,0),.25).normalize())}}return{wood:kf(n),leaves:f.build(),height:u.y+d}}function rp(e){let t=Bd(e*977+3),n=9+t()*5,r=new U(`#7a6552`),i=[Qf([new V(0,-.3,0),new V((t()-.5)*.2,n*.5,(t()-.5)*.2),new V(0,n,0)],.32,.03,7,r)],a=new $f,o=new U,s=1.6+t()*.8;for(let e=s;e<n-.3;e+=.5+t()*.15){let c=(e-s)/(n-s),l=(1-c)**.9*3+.45,u=5+Math.floor(t()*3),d=t()*Math.PI*2;for(let n=0;n<u;n++){let s=d+n/u*Math.PI*2+(t()-.5)*.4,f=new V(Math.cos(s),-.12-t()*.2,Math.sin(s)).normalize();if(c<.55&&t()<.5){let t=new V(0,e,0).addScaledVector(f,l*.9);t.y-=l*.12,i.push(Qf([new V(0,e,0),new V(0,e,0).addScaledVector(f,l*.5),t],.05,.015,3,r))}let p=l>1.6?2:1;for(let n=0;n<p;n++){let r=(n+.55)/p,i=new V(0,e,0).addScaledVector(f,l*r);i.y-=l*.12*r*r;let s=new V(-f.z,0,f.x).normalize(),u=new V().crossVectors(f,s).normalize(),d=l/p*1.35,m=Math.min(1.3,.5+l*.3),h=.5+c*.35+r*.2+t()*.1;o.setRGB(.55*h,.75*h,.55*h);let g=t=>new V(t.x,t.y-e+.8,t.z).normalize();a.add(i,f.clone(),s.clone().lerp(u,.25).normalize(),d,m,o,g),a.add(i.clone().add(new V(0,.08,0)),f.clone(),u.clone().lerp(s,.35).normalize(),d*.9,m*.7,o,g)}}}for(let e=0;e<4;e++){let t=e/4*Math.PI;o.setRGB(.5,.72,.5),a.add(new V(0,n-.2,0),new V(Math.cos(t),0,Math.sin(t)),new V(0,1,0),.8,1.4,o,e=>new V(e.x,.8,e.z).normalize())}return{wood:kf(i),leaves:a.build(),height:n}}function ip(e){let t=Bd(e*53+1),n=new $f,r=new U,i=new V(0,.45,0);for(let e=0;e<14;e++){let e=new V((t()-.5)*1.3,.25+t()*.55,(t()-.5)*1.3),[a,o]=tp(ep(t).lerp(e.clone().sub(i).normalize(),.5).normalize(),t),s=.6+t()*.4,c=.6+e.y*.5;r.setRGB(.72*c,.8*c,.6*c),n.add(e,a,o,s,s,r,e=>e.clone().sub(i).normalize())}return{wood:null,leaves:n.build(),height:1}}var ap={};function op(){return ap.broad||(ap.broad=Gf(`broad`),ap.pine=Gf(`pine`),ap.sage=Gf(`sage`)),ap}var sp={uTime:{value:0},uPlayer:{value:new V}},cp=`
vec2 windOffset(vec3 wp, float t){
  float w = sin(t*1.3 + wp.x*0.09 + wp.z*0.05)*0.6 + sin(t*2.3 + wp.x*0.21 - wp.z*0.13)*0.25 + 0.35;
  return vec2(0.8, 0.45) * w;
}`;function lp(e,{strength:t=.05,start:n=0,power:r=2,flutter:i=0}={}){return e.onBeforeCompile=e=>{e.uniforms.uTime=sp.uTime,e.vertexShader=e.vertexShader.replace(`#include <common>`,`#include <common>\nuniform float uTime;\n${cp}`).replace(`#include <project_vertex>`,`
        vec4 mvPosition = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          mvPosition = instanceMatrix * mvPosition;
        #endif
        mvPosition = modelMatrix * mvPosition;
        float hh = max(transformed.y - ${n.toFixed(2)}, 0.0);
        mvPosition.xz += windOffset(mvPosition.xyz, uTime) * pow(hh, ${r.toFixed(2)}) * ${t.toFixed(4)};
        float flt = sin(uTime * 5.0 + dot(mvPosition.xyz, vec3(3.1, 1.7, 2.3))) * ${i.toFixed(3)} * hh;
        mvPosition.xyz += vec3(flt, flt * 0.4, -flt * 0.7);
        mvPosition = viewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;`)},e}function up(e,t){let n=e.attributes.position.count,r=new Float32Array(n*3),i=new U(t);for(let e=0;e<n;e++)r[e*3]=i.r,r[e*3+1]=i.g,r[e*3+2]=i.b;return e.setAttribute(`color`,new On(r,3)),e}function dp(e,t,n,r,i){e.computeBoundingBox();let a=e.attributes.position.count,o=new Float32Array(a*3),s=new U(t),c=new U(n),l=new U;for(let t=0;t<a;t++){let n=e.attributes.position.getY(t);l.copy(s).lerp(c,q(r,i,n)),o[t*3]=l.r,o[t*3+1]=l.g,o[t*3+2]=l.b}return e.setAttribute(`color`,new On(o,3)),e}function fp(e){for(let t of Object.keys(e.attributes))[`position`,`normal`,`color`].includes(t)||e.deleteAttribute(t);return e.index?e.toNonIndexed():e}var pp={uSunDir:{value:new V(0,1,0)},uSunCol:{value:new U(1,1,1)},uAmb:{value:new U(.3,.3,.3)},uCenter:{value:new V}};function mp({blades:e,segs:t,width:n,spread:r},i){let a=[],o=[],s=[],c=[],l=[];for(let u=0;u<e;u++){let e=i()*Math.PI*2,u=i()*Math.PI*2,d=.08+i()*.22,f=.65+i()*.5,p=n*(.75+i()*.5),m=Math.sqrt(i())*r,h=i()*Math.PI*2,g=Math.cos(h)*m,_=Math.sin(h)*m,v=Math.cos(e),y=Math.sin(e),b=Math.cos(u),x=Math.sin(u),S=i(),C=a.length/3,w=0,T=0,E=0;for(let e=0;e<=t;e++){let n=e/t;if(e>0){let e=d*(n-.5/t)*1.6,r=f/t;w+=b*Math.sin(e)*r,E+=x*Math.sin(e)*r,T+=Math.cos(e)*r}let r=p*(1-n)**.7+.0015;r*.35;for(let e of[-1,1]){a.push(g+w+v*r*e,T,_+E+y*r*e);let t=new V(-y+v*e*.35,.25,v+y*e*.35).normalize();o.push(t.x,t.y,t.z),s.push(n),c.push(S)}if(e<t){let t=C+e*2;l.push(t,t+1,t+2,t+1,t+3,t+2)}}}let u=new ys;return u.setAttribute(`position`,new W(a,3)),u.setAttribute(`normal`,new W(o,3)),u.setAttribute(`aT`,new W(s,1)),u.setAttribute(`aSeed`,new W(c,1)),u.setIndex(l),u}function hp(e,t,{count:n,patch:r,fadeInA:i,fadeInB:a,fadeOutA:o,fadeOutB:s,tuft:c,seed:l}){let u=Bd(l),d=mp(c,u),f=new Float32Array(n*4);for(let e=0;e<n;e++)f[e*4]=u()*r,f[e*4+1]=u()*r,f[e*4+2]=u()*Math.PI*2,f[e*4+3]=u();d.setAttribute(`aInst`,new Mr(f,4)),d.instanceCount=n;let p=ro.merge([K.fog,{uHeight:{value:e},uColor:{value:t},uPatch:{value:r},uFade:{value:new st(i,a,o,s)},uHalf:{value:700},uCell:{value:5},uSeg:{value:280}}]);Object.assign(p,pp,{uTime:sp.uTime,uPlayer:sp.uPlayer});let m=new G(d,new oo({uniforms:p,fog:!0,side:2,vertexShader:`
      #include <fog_pars_vertex>
      uniform sampler2D uHeight, uColor;
      uniform vec3 uCenter, uPlayer;
      uniform vec4 uFade;
      uniform float uPatch, uTime, uHalf, uCell, uSeg;
      attribute vec4 aInst;
      attribute float aT, aSeed;
      varying vec3 vCol; varying vec3 vN; varying vec3 vW; varying float vT; varying float vWave;
      vec4 tri(sampler2D tex, vec2 w){
        vec2 f = clamp((w + uHalf)/uCell, vec2(0.0), vec2(uSeg - 0.001));
        ivec2 i = ivec2(floor(f)); vec2 uv = f - vec2(i);
        vec4 a = texelFetch(tex, i, 0), b = texelFetch(tex, i + ivec2(1,0), 0);
        vec4 c = texelFetch(tex, i + ivec2(0,1), 0), d = texelFetch(tex, i + ivec2(1,1), 0);
        if (uv.x + uv.y <= 1.0) return a + (b-a)*uv.x + (c-a)*uv.y;
        return d + (c-d)*(1.0-uv.x) + (b-d)*(1.0-uv.y);
      }
      float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
      void main(){
        vec2 off = aInst.xy;
        vec2 w = off + uPatch * floor((uCenter.xz - off)/uPatch + 0.5);
        float r = aInst.w;
        float dist = length(w - uCenter.xz);
        // dithered cross-fade between rings: no visible circle
        float keepIn = uFade.y > 0.0 ? step(1.0 - smoothstep(uFade.x, uFade.y, dist), r) : 1.0;
        float keepOut = step(smoothstep(uFade.z, uFade.w, dist), r);
        vec4 T = tri(uHeight, w);
        vec3 ground = tri(uColor, w).rgb;
        float mask = smoothstep(0.3, 0.7, T.g);
        float show = keepIn * keepOut * step(0.15, mask);
        // meadow height: consistent, varying slowly across the field
        float patchN = vnoise(w * 0.05);
        float fine = vnoise(w * 0.6);
        float hgt = (0.4 + patchN * 0.22 + fine * 0.08 + T.b * 0.12) * (0.8 + r * 0.35) * mix(0.5, 1.0, mask) * show;
        float rot = aInst.z;
        float c = cos(rot), s = sin(rot);
        mat2 R = mat2(c, -s, s, c);
        vec3 p = position;
        p.xz = R * p.xz;
        p *= hgt;
        vec3 nrm = normal; nrm.xz = R * nrm.xz;
        float t = aT;

        // wind: slow rolling waves + per-blade flutter, applied as a bend that keeps blade length
        vec2 wdir = normalize(vec2(0.85, 0.5));
        float wave = vnoise(w * 0.035 - wdir * uTime * 0.55) * 0.75 + vnoise(w * 0.11 - wdir * uTime * 1.3) * 0.25;
        float flutter = sin(uTime * (2.2 + aSeed * 1.8) + aSeed * 30.0 + w.x * 0.4) * 0.06;
        float bend = 0.06 + wave * 0.34 + flutter;                 // radians at the tip
        vec2 side = vec2(-wdir.y, wdir.x) * sin(uTime * 0.9 + aSeed * 12.0) * 0.04;
        // push away from the player
        vec2 d = w - uPlayer.xz;
        float pd = length(d);
        float push = (1.0 - smoothstep(0.2, 1.1, pd)) * step(abs(uPlayer.y - T.r), 2.0);
        vec2 bdir = normalize(wdir * bend + side + normalize(d + 1e-4) * push * 1.2 + 1e-5);
        float bamt = length(wdir * bend + side) + push * 1.1;
        float ang = bamt * t * t;
        float along = p.y;
        p.y = along * cos(ang);
        p.xz += bdir * along * sin(ang);
        vec3 wp = vec3(w.x + p.x, T.r + p.y, w.y + p.z);

        // colour: coherent patches of greener and drier grass
        float dry = clamp(T.b * 0.85 + (patchN - 0.5) * 0.8 + (fine - 0.5) * 0.25, 0.0, 1.0);
        vec3 lush = vec3(0.28, 0.40, 0.13), mid = vec3(0.46, 0.50, 0.22), straw = vec3(0.70, 0.61, 0.34);
        vec3 tip = dry < 0.5 ? mix(lush, mid, dry * 2.0) : mix(mid, straw, dry * 2.0 - 1.0);
        tip *= 0.9 + (h21(vec2(r * 13.0, aSeed * 7.0)) - 0.5) * 0.16;
        tip = mix(tip, ground * 1.5, 0.12);
        vec3 root = mix(ground * 0.45, tip * 0.35, 0.4);
        vCol = mix(root, tip, smoothstep(0.0, 0.85, t));
        vN = normalize(nrm + vec3(bdir.x, 0.0, bdir.y) * 0.3);
        vT = t; vW = wp; vWave = wave;
        vec4 mvPosition = viewMatrix * vec4(wp, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,fragmentShader:`
      #include <common>
      #include <fog_pars_fragment>
      uniform vec3 uSunDir, uSunCol, uAmb;
      varying vec3 vCol; varying vec3 vN; varying vec3 vW; varying float vT; varying float vWave;
      void main(){
        vec3 N = normalize(vN) * (gl_FrontFacing ? 1.0 : -1.0);
        N = normalize(mix(N, vec3(0.0, 1.0, 0.0), 0.5));
        vec3 V = normalize(cameraPosition - vW);
        float diff = max(dot(N, uSunDir), 0.0) * 0.6 + 0.4;
        float back = pow(max(dot(-V, uSunDir), 0.0), 6.0) * vT * 0.5;   // soft translucency at the tips
        vec3 H = normalize(uSunDir + V);
        float sheen = pow(max(dot(N, H), 0.0), 40.0) * 0.08 * vT;
        float ao = mix(0.35, 1.0, smoothstep(0.0, 0.6, vT));
        vec3 col = vCol * (uAmb + uSunCol * diff) * ao;
        col += vCol * uSunCol * back;
        col += uSunCol * sheen;
        col *= 0.96 + vWave * 0.1 * vT;       // wind waves visible as gentle shimmer
        gl_FragColor = vec4(col, 1.0);
        #include <fog_fragment>
      }`}));return m.frustumCulled=!1,m}function gp(e,t){let n=new H;return n.name=`grass`,n.add(hp(e,t,{count:72e3,patch:64,fadeInA:0,fadeInB:0,fadeOutA:20,fadeOutB:30,tuft:{blades:9,segs:4,width:.015,spread:.26},seed:42})),n.add(hp(e,t,{count:52e3,patch:200,fadeInA:20,fadeInB:30,fadeOutA:80,fadeOutB:98,tuft:{blades:6,segs:2,width:.032,spread:.36},seed:7})),n}function _p(){let e=[],t=Bd(7);for(let n=0;n<5;n++){let n=.95+t()*.3,r=(t()-.5)*.35,i=(t()-.5)*.35,a=new Wa(.035,n,1,2);a.translate(r,n/2,i),a.rotateY(t()*Math.PI),dp(a,`#6f7a2a`,`#d8b456`,0,n);let o=new Wa(.09,.22);o.translate(0,n+.05,0),o.rotateZ((t()-.5)*.2),o.translate(r,0,i),o.rotateY(t()*Math.PI),up(o,t()>.5?`#e6c064`:`#d9a94a`),e.push(fp(a),fp(o))}return kf(e)}function vp(){let e=[],t=1.7,n=new bi(.025,.035,t,5);n.translate(0,t/2,0),up(n,`#4f7a2a`),e.push(fp(n));for(let t=0;t<3;t++){let n=new yi(.14,6);n.scale(1.4,1,1),n.rotateX(-Math.PI/2+.4),n.translate(.18,.5+t*.35,0),n.rotateY(t*2.2),up(n,`#4a7a28`),e.push(fp(n))}let r=new yi(.28,14),i=r.attributes.position;for(let e=1;e<i.count;e++){let t=i.getX(e),n=i.getY(e),r=.75+.25*Math.abs(Math.cos(Math.atan2(n,t)*7));i.setXY(e,t*r,n*r)}up(r,`#f5c52a`),r.translate(0,0,.005);let a=new yi(.14,12);up(a,`#4a2c14`),a.translate(0,0,.012);for(let n of[r,a])n.rotateX(-.35),n.translate(0,t,.06),e.push(fp(n));return kf(e)}function yp(e,t){let n=e.attributes.position,r=new Float32Array(n.count*3),i=new U;for(let e=0;e<n.count;e++)t(i,n.getX(e),n.getY(e),n.getZ(e),e),r[e*3]=i.r,r[e*3+1]=i.g,r[e*3+2]=i.b;return e.setAttribute(`color`,new On(r,3)),e}function bp(e,t,n,r,i,a,o){let s=[],c=[],l=[],u=new U(`#5d7a2c`),d=new U(`#9aa24e`),f=new U(`#b8954e`),p=new U;for(let m=0;m<=n;m++){let h=m/n,g=t*Math.sin(Math.PI*Math.min(1,h*.9+.08))**.7*(1-h*.35),_=h*e,v=r*_-i*_*_,y=o*h,b=g*.35;for(let e=-1;e<=1;e++){let t=e*g,n=v+(e===0?b:0);s.push(_,n+t*Math.sin(y),t*Math.cos(y));let r=q(1-a,1,h);p.copy(u).lerp(d,h*.6+(e===0?.15:0)).lerp(f,Math.min(1,r*.9+a*.35)),c.push(p.r,p.g,p.b)}if(m<n){let e=m*3;l.push(e,e+3,e+1,e+1,e+3,e+4,e+1,e+4,e+2,e+2,e+4,e+5)}}let m=new Hn;return m.setAttribute(`position`,new W(s,3)),m.setAttribute(`color`,new W(c,3)),m.setIndex(l),m.computeVertexNormals(),m.toNonIndexed()}function xp(e){let t=Bd(e*31+5),n=[],r=2.2+t()*.35,i=new bi(.016,.03,r,6,6);i.translate(0,r/2,0);let a=i.attributes.position;for(let e=0;e<a.count;e++){let t=a.getY(e),n=1+.18*Math.exp(-((t%.3-.02)**2)/6e-4);a.setX(e,a.getX(e)*n+Math.sin(t*1.3)*.02),a.setZ(e,a.getZ(e)*n)}i.computeVertexNormals(),yp(i,(e,t,n)=>e.set(`#5a7a2e`).lerp(new U(`#93a04c`),q(.3,r,n))),n.push(fp(i));for(let e=0;e<10;e++){let i=.28+e*(r-.6)/10,a=.95-Math.abs(e-3.5)*.07+t()*.1,o=e<2?.7-e*.25:.12+t()*.15,s=bp(a,.055+t()*.015,7,1+t()*.4,1.25+t()*.5,o,(t()-.5)*1.2);s.rotateY((e%2?Math.PI:0)+(t()-.5)*.7),s.translate(0,i,0),n.push(fp(s))}for(let e=0;e<(t()>.6?2:1);e++){let r=new bi(.018,.045,.26,7,3),i=r.attributes.position;for(let e=0;e<i.count;e++){let t=i.getY(e),n=1-Math.abs(t/.13)**3*.5;i.setX(e,i.getX(e)*n),i.setZ(e,i.getZ(e)*n)}r.computeVertexNormals(),yp(r,(e,t,n)=>e.set(`#a9ad62`).lerp(new U(`#d8c78a`),q(-.13,.13,n))),r.translate(0,.13,0),r.rotateZ(-.45-t()*.2);let a=new xi(.02,.08,5);yp(a,e=>e.set(`#8a5a2a`)),a.translate(0,.3,0),a.rotateZ(-.45);let o=kf([fp(r),fp(a)]);o.rotateY(t()*Math.PI*2),o.translate(0,1+e*.28,0),n.push(o)}let o=[],s=new bi(.003,.007,.32,4);s.translate(0,r+.14,0),o.push(s);for(let e=0;e<4;e++){let n=new bi(.002,.005,.2,3);n.translate(0,.1,0),n.rotateZ(.45+t()*.4),n.rotateY(e/6*Math.PI*2+t()),n.translate(0,r+.02+t()*.08,0),o.push(n)}for(let e of o)yp(e,e=>e.set(`#c4b070`).multiplyScalar(.85+t()*.15)),n.push(fp(e));return kf(n)}function Sp(){let e=[],t=2.3,n=new bi(.02,.03,t,3,1);n.translate(0,t/2,0),yp(n,(e,n,r)=>e.set(`#5a7a2e`).lerp(new U(`#93a04c`),r/t)),e.push(fp(n));for(let t=0;t<5;t++){let n=bp(.85,.07,3,1.1,1.4,t<1?.8:.3,0);n.rotateY(t*2.2),n.translate(0,.4+t*.36,0),e.push(fp(n))}let r=new xi(.03,.3,3);return r.translate(0,2.4499999999999997,0),yp(r,e=>e.set(`#c4b070`)),e.push(fp(r)),kf(e)}function Cp(e){let t=Bd(99),n=lp(new co({vertexColors:!0,roughness:.8,side:2}),{strength:.09,power:2,flutter:.05}),r={wheat:{hi:[_p()],lo:_p(),sx:.65,sz:.65,jitter:.3,shadow:!1},corn:{hi:[xp(1),xp(2),xp(3)],lo:Sp(),sx:.95,sz:.5,jitter:.1,shadow:!0},sunflower:{hi:[vp()],lo:vp(),sx:.9,sz:.8,jitter:.15,shadow:!0}},i=[],a=new ft,o=new B,s=new St,c=new V,l=new V,u=new U;for(let d of Kd){let f=r[d.crop],p=new Map;for(let e=-d.w/2+1;e<d.w/2-1;e+=f.sx)for(let n=-d.d/2+1;n<d.d/2-1;n+=f.sz){let[r,i]=Tf(d,e+(t()-.5)*f.jitter,n+(t()-.5)*f.jitter);if(af.dist(r,i)<4)continue;let m=Math.hypot(r-Y.crash.x,i-Y.crash.z),h=0,g=0,_=.88+t()*.24;if(d===Kd[0]){if(m<13||Math.hypot(r-(Y.crash.x+11),i-(Y.crash.z-10))<5.5||Math.hypot(r-(Y.crash.x-6.5),i-(Y.crash.z+12))<3.8)continue;m<24&&t()<q(24,13,m)&&(h=1.2+t()*.3,g=Math.atan2(r-Y.crash.x,i-Y.crash.z))}l.set(r,X(r,i)-.05,i),h?o.setFromEuler(s.set(h,g,0,`YXZ`)):o.setFromEuler(s.set((t()-.5)*.1,t()*Math.PI*2,(t()-.5)*.1)),c.set(_,_*(.9+t()*.2),_);let v=`${Math.floor((e+d.w/2)/12)},${Math.floor((n+d.d/2)/12)}`,y=p.get(v);y||p.set(v,y={items:[],cx:0,cz:0});let b=t();u.setRGB(.9+b*.22,.95+b*.08,.82+(1-b)*.16).multiplyScalar(.88+t()*.2),y.items.push({m:a.compose(l,o,c).clone(),col:u.clone(),v:Math.floor(t()*f.hi.length)}),y.cx+=r,y.cz+=i}for(let t of p.values()){let r=new V(t.cx/t.items.length,0,t.cz/t.items.length);r.y=X(r.x,r.z);let a=f.hi.map((r,i)=>{let a=t.items.filter(e=>e.v===i);if(!a.length)return null;let o=new Br(r,n,a.length);return a.forEach((e,t)=>{o.setMatrixAt(t,e.m),o.setColorAt(t,e.col)}),o.castShadow=f.shadow,o.receiveShadow=!0,o.computeBoundingSphere(),e.add(o),o}).filter(Boolean),o=new Br(f.lo,n,t.items.length);t.items.forEach((e,t)=>{o.setMatrixAt(t,e.m),o.setColorAt(t,e.col)}),o.castShadow=f.shadow,o.receiveShadow=!0,o.computeBoundingSphere(),e.add(o),i.push({center:r,hi:a,lo:o,near:null,detail:d.crop===`corn`?34:1e9})}}return{update(e){for(let t of i){let n=t.center.distanceTo(e)<t.detail;if(n!==t.near){t.near=n;for(let e of t.hi)e.visible=n;t.lo.visible=!n}}}}}function wp(e){let t=Bd(e),n=new Va(1,1),r=n.attributes.position,i=new Map;for(let e=0;e<r.count;e++){let n=`${r.getX(e).toFixed(3)},${r.getY(e).toFixed(3)},${r.getZ(e).toFixed(3)}`;i.has(n)||i.set(n,.75+t()*.45);let a=i.get(n);r.setXYZ(e,r.getX(e)*a*1.3,r.getY(e)*a*.8,r.getZ(e)*a)}return n.translate(0,.25,0),dp(n,`#6d625c`,`#a5968a`,-.5,1),fp(n)}function Tp(e,t,n,r=20){let i=[];for(let a=0;a<e*r&&i.length<e;a++){let e=(t()*2-1)*680,r=(t()*2-1)*680,a=n(e,r,t);a&&i.push([e,r,a])}return i}function Ep(e,t,n=8){if(af.dist(e,t)<n||of(e,t))return!1;for(let r of[Y.town,Y.ranch,Y.crash,Y.mine])if(Math.hypot(e-r.x,t-r.z)<r.r+n)return!1;return!0}function Dp(e,t,n,r,i,{shadow:a=!0,collide:o,collision:s}={}){let c=t.map(()=>[]),l=new ft,u=new B,d=new St,f=new V,p=new V,m=Bd(n.length+5);for(let[e,r]of n){let n=Math.floor(m()*t.length),a=i(e,r,m);p.set(e,X(e,r)-.15*a,r),u.setFromEuler(d.set((m()-.5)*.08,m()*Math.PI*2,(m()-.5)*.08)),f.set(a,a*(.9+m()*.25),a),c[n].push(l.compose(p,u,f).clone()),o&&s&&s.addCircle(e,r,o*a)}let h=[];return t.forEach((t,n)=>{if(!c[n].length)return;let i=new Br(t,r,c[n].length);c[n].forEach((e,t)=>i.setMatrixAt(t,e)),i.castShadow=a,i.receiveShadow=!0,i.computeBoundingSphere(),e.add(i),h.push(i)}),h}function Op(e,t,n,r,{collide:i,collision:a,leafMat:o,depthMat:s}){let c=t.map(()=>[]),l=new ft,u=new B,d=new St,f=new V,p=new V,m=Bd(n.length+11);for(let[e,o]of n){let n=Math.floor(m()*t.length),s=r(e,o,m);p.set(e,X(e,o)-.05,o),u.setFromEuler(d.set((m()-.5)*.06,m()*Math.PI*2,(m()-.5)*.06)),f.set(s,s*(.9+m()*.2),s),c[n].push(l.compose(p,u,f).clone()),i&&a&&a.addCircle(e,o,i*s)}t.forEach((t,n)=>{if(!c[n].length)return;let r=[[t.leaves,o,s]];t.wood&&r.push([t.wood,Zf(),null]);for(let[t,i,a]of r){let r=new Br(t,i,c[n].length);c[n].forEach((e,t)=>r.setMatrixAt(t,e)),r.castShadow=!0,r.receiveShadow=!0,a&&(r.customDepthMaterial=a),r.computeBoundingSphere(),e.add(r)}})}function kp(e,t,n){let r=op(),i={uTime:sp.uTime,uSunDir:n.uSunDir,uSunCol:n.uSunCol},a=Jf(r.broad,i,{sway:.018,flutter:.035,start:2.5}),o=Jf(r.pine,i,{sway:.01,flutter:.02,start:2}),s=Jf(r.sage,i,{sway:.05,flutter:.02,start:.1}),c=Bd(2024),l=new co({vertexColors:!0,roughness:.95,flatShading:!0}),u=Tp(520,c,(e,t,n)=>{if(!Ep(e,t)||_f(e,t)||X(e,t)<1.4||sf(e,t)>.35)return!1;let r=rf.dist(e,t),i=Math.hypot(e-Y.lake.x,t-Y.lake.z),a=Math.max(q(45,14,r),q(150,85,i)),o=Math.sin(e*.013)*Math.cos(t*.011)>.72?.25:.015;return n()<Math.max(a*.6,o)},60);u.push([Y.lookout.x+4,Y.lookout.z-2]),Op(e,[1,2,3,4,5].map(np),u,(e,t,n)=>.85+n()*.55,{collide:.45,collision:t,leafMat:a,depthMat:Yf(r.broad)});let d=Tp(1100,c,(e,t,n)=>{let r=sf(e,t),i=X(e,t);return r<.08||i>115||!Ep(e,t,4)?!1:n()<q(.08,.4,r)*(1-q(80,115,i))},30);Op(e,[1,2,3,4].map(rp),d,(e,t,n)=>.75+n()*.6,{collide:.4,collision:t,leafMat:o,depthMat:Yf(r.pine)});let f=Tp(700,c,(e,t,n)=>{if(!Ep(e,t,4))return!1;let r=sf(e,t);return n()<.08+r*.8},20);Dp(e,[wp(1),wp(2),wp(3)],f,l,(e,t,n)=>{let r=sf(e,t);return .4+n()*1.2+r*n()*3},{collide:.8,collision:t});let p=Tp(900,c,(e,t,n)=>!Ep(e,t,3)||Cf(e,t)<.5||_f(e,t)?!1:n()<.3,10);Op(e,[1,2,3].map(ip),p,(e,t,n)=>.7+n()*.7,{leafMat:s,depthMat:Yf(r.sage)})}function Ap(e){let t=Bd(555),n=[`#9b6bd6`,`#f2d24a`,`#f4f1ea`,`#e4573d`,`#6f8ef0`,`#f08bb0`],r=n.map(e=>{let t=[];for(let n=0;n<5;n++){let r=.25+n%3*.12,i=new Wa(.02,r);i.translate(0,r/2,0),up(i,`#4f6a2a`);let a=new Ua(.055,0);a.translate(0,r,0),up(a,e);let o=n*1.26,s=.12+n%2*.1;for(let e of[i,a])e.translate(Math.cos(o)*s,0,Math.sin(o)*s),t.push(fp(e))}return kf(t)}),i=lp(new co({vertexColors:!0,roughness:.8,side:2}),{strength:.2,power:2}),a=[];for(let e=0;e<260;e++){let e=(t()*2-1)*480,r=(t()*2-1)*480;if(Math.hypot(e,r)>510)continue;let i=15+Math.floor(t()*45),o=Math.floor(t()*n.length);for(let n=0;n<i;n++){let n=e+(t()-.5)*22,i=r+(t()-.5)*22;Cf(n,i)<.6||!Ep(n,i,2)||a.push([n,i,o])}}let o=n.map(()=>[]),s=new ft,c=new B,l=new V,u=new V,d=new St;for(let[e,n,r]of a){let i=.8+t()*.6;o[r].push(s.compose(u.set(e,X(e,n),n),c.setFromEuler(d.set(0,t()*6.28,0)),l.set(i,i,i)).clone())}r.forEach((t,n)=>{let r=new Br(t,i,o[n].length);o[n].forEach((e,t)=>r.setMatrixAt(t,e)),r.computeBoundingSphere(),e.add(r)})}var jp={};function Mp(){return jp.plank||(jp.plank=Pf(1),jp.plankV=Pf(2,!0),jp.shingle=Ff(),jp.window=Rf(),jp.metal=If()),jp}var Np=new Map;function Pp(e=`#8a6a4a`,t=!1){let n=`w${e}${t}`;return Np.has(n)||Np.set(n,new co({color:e,map:t?Mp().plankV:Mp().plank,roughness:.9})),Np.get(n)}function Fp(e=`#6a5a52`){let t=`r${e}`;return Np.has(t)||Np.set(t,new co({color:e,map:Mp().shingle,roughness:.95})),Np.get(t)}function Ip(e,t={}){let n=`f${e}${JSON.stringify(t)}`;return Np.has(n)||Np.set(n,new co({color:e,roughness:.8,...t})),Np.get(n)}var Lp=new co({color:`#3a4450`,emissive:`#ffb35a`,emissiveIntensity:0,roughness:.3,metalness:.2});function Rp(e){Lp.emissiveIntensity=e*2.2,Lp.color.setRGB(.23*(1-e)+.05,.27*(1-e)+.04,.31*(1-e)+.03);for(let t of zp)t.emissiveIntensity=.4+e*5}var zp=[];function Bp(){let e=new co({color:`#ffdca0`,emissive:`#ffb04a`,emissiveIntensity:1});return zp.push(e),e}function Z(e,t,n,r,i=0,a=0,o=0,s=2.2){let c=new _i(e,t,n),l=c.attributes.uv,u=[[n,t],[n,t],[e,n],[e,n],[e,t],[e,t]];for(let e=0;e<l.count;e++){let[t,n]=u[Math.floor(e/4)];l.setXY(e,l.getX(e)*t/s,l.getY(e)*n/s)}let d=new G(c,r);return d.position.set(i,a,o),d.castShadow=!0,d.receiveShadow=!0,d}function Vp(e,t,n,r,i=8,a=0,o=0,s=0){let c=new G(new bi(e,t,n,i),r);return c.position.set(a,o,s),c.castShadow=!0,c.receiveShadow=!0,c}function Hp(e,t,n){return new G(new Wa(e,t),n)}function Up(e,t,n,r={}){let i=Lf(e,{w:512,h:Math.round(512*n/t),...r});return new G(new Wa(t,n),new co({map:i,roughness:.85}))}function Wp(e,t,n,r,i,a,o,s){let c=new V(n,0,r);return e.updateMatrixWorld(!0),c.applyMatrix4(e.matrixWorld),t.addBox(c.x,c.z,i,a,e.rotation.y,o,s)}function Gp(e,t,n,r,i,a,o){let s=new V(n,0,r);return e.updateMatrixWorld(!0),s.applyMatrix4(e.matrixWorld),t.addPlatform(s.x,s.z,i,a,e.rotation.y,e.position.y+o)}function Kp(e,t,n,r,i,a,o=.4){let s=t/2+o,c=t/2*Math.tan(i),l=Math.hypot(s,Math.tan(i)*s);for(let t of[-1,1]){let u=Z(l,.18,n+o*2,a,t*s/2,r+c/2+.1,-n/2);u.rotation.z=-t*i,e.add(u)}let u=new Ka(new ea([new z(-t/2,0),new z(t/2,0),new z(0,c)]));for(let t of[0,-n]){let n=new G(u,e.userData.wallMat);t<0&&(n.rotation.y=Math.PI),n.position.set(0,r,t),n.castShadow=!0,e.add(n)}return c}function qp({w:e=10,d:t=14,h:n=4.2,facadeH:r=7,color:i=`#9a7452`,trim:a=`#e8dcc0`,sign:o=`STORE`,signBg:s=`#3a2718`,signFg:c=`#f3e6c8`,twoStory:l=!1,porch:u=!0,saloonDoors:d=!1}){let f=new H,p=Pp(i);f.userData.wallMat=p;let m=Pp(a),h=l?6.5:n;f.add(Z(e,h,t,p,0,h/2,-t/2)),Kp(f,e,t,h,.35,Fp(`#6b5a50`));let g=Math.max(r,h+1.8),_=Z(e+.3,g,.3,p,0,g/2,.15);f.add(_),f.add(Z(e+.7,.35,.55,m,0,g+.1,.2)),f.add(Z(e*.5,.8,.3,p,0,g+.6,.15)),f.add(Z(e*.5+.3,.2,.45,m,0,g+1.05,.2));for(let t of[-1,1])f.add(Z(.25,g,.4,m,t*(e/2+.1),g/2,.2));let v=Up(o,Math.min(e*.8,9),1.5,{bg:s,fg:c});v.position.set(0,g-1.15,.32),f.add(v);let y=Ip(`#2a1c12`);if(f.add(Z(1.8,2.6,.1,y,0,1.6,.32)),f.add(Z(2.2,.2,.2,m,0,3,.36)),d){let e=[];for(let t of[-1,1]){let n=new H;n.position.set(t*.9,1.7,.75);let r=Z(.88,1.1,.06,Pp(`#b08050`,!0),-t*.44,0,0);n.add(r),f.add(n),e.push(n)}f.userData.saloonDoors=e}let b=1.3,x=1.8,S=Math.max(1,Math.floor((e-3)/3.2));for(let t=0;t<S;t++)for(let n of[-1,1]){let r=n*(1.9+t*2.2+b/2);if(Math.abs(r)>e/2-.8)continue;let i=Hp(b,x,Lp);i.position.set(r,1.9,.31),f.add(i),f.add(Z(1.65,.12,.2,m,r,.95,.38)),f.add(Z(1.65,.15,.15,m,r,2.85,.36));for(let e of[-1,1])f.add(Z(.1,x,.12,m,r+e*b/2,1.9,.34));f.add(Z(.06,x,.06,m,r,1.9,.33))}if(l)for(let e=-1;e<=1;e++){let t=Hp(1.1,1.5,Lp);t.position.set(e*3,4.8,.31),f.add(t);for(let t of[-1,1])f.add(Z(.12,1.6,.12,m,e*3+t*.6,4.8,.34));f.add(Z(1.4,.12,.2,m,e*3,4,.36))}if(u){let t=Pp(`#7a5c40`),n=2.6;f.add(Z(e+1.2,.3,n,t,0,.15,1.6)),f.add(Z(e+1.2,.15,.5,t,0,.07,3.1500000000000004));let r=Math.max(2,Math.round(e/3.2)+1),i=l?3.4:3.1;for(let t=0;t<r;t++){let n=-e/2-.4+t/(r-1)*(e+.8);f.add(Z(.2,i,.2,m,n,i/2+.3,2.8000000000000003))}if(l){f.add(Z(e+1.2,.25,2.8000000000000003,t,0,i+.4,1.6)),f.add(Z(e+1.2,.1,.1,m,0,i+1.4,2.8000000000000003));for(let t=0;t<=e*2;t++)f.add(Z(.06,.9,.06,m,-e/2-.5+t*.5,i+.95,2.8000000000000003))}else{let t=Z(e+1.4,.14,3.1,Fp(`#5f5048`),0,i+.5,1.55);t.rotation.x=.12,f.add(t)}f.userData.porch={w:e+1.2,d:n,top:.3}}return f.userData.w=e,f.userData.d=t,f}function Jp(e,t){let{w:n,d:r,porch:i}=e.userData;if(Wp(e,t,0,-r/2+.2,n/2+.2,r/2+.2),i){Gp(e,t,0,i.d/2+.4,i.w/2,i.d/2+.2,i.top);let r=Math.max(2,Math.round(n/3.2)+1);for(let a=0;a<r;a++)Wp(e,t,-n/2-.4+a/(r-1)*(n+.8),i.d+.2,.15,.15)}}function Yp(){let e=new H,t=Pp(`#e9e4da`,!0);e.userData.wallMat=t,e.add(Z(9,5,15,t,0,5/2,-15/2)),Kp(e,9,15,5,.6,Fp(`#4e4a52`)),e.add(Z(3.2,5,3.2,t,0,7,1.2-1.6)),e.add(Z(2.6,2.2,2.6,t,0,10.6,-.4));let n=new G(new xi(2,5,4),Fp(`#4e4a52`));n.rotation.y=Math.PI/4,n.position.set(0,14.2,-.4),n.castShadow=!0,e.add(n);let r=new G(new Ja(.55,12,8,0,Math.PI*2,0,Math.PI/2),Ip(`#b08a3a`,{metalness:.8,roughness:.3}));r.position.set(0,10.1,-.4),e.add(r);let i=Ip(`#5a2e20`);e.add(Z(2,3,.2,i,0,1.5,.1));let a=Hp(1.1,2.4,Lp);for(let t of[-1,1])for(let n=0;n<3;n++){let r=a.clone();r.position.set(t*4.51,2.6,-3-n*4),r.rotation.y=t*Math.PI/2,e.add(r)}return e.add(Z(.15,1.2,.15,Ip(`#e8e0d0`),0,17.2,-.4)),e.add(Z(.7,.15,.15,Ip(`#e8e0d0`),0,17.4,-.4)),e.userData.w=9,e.userData.d=15,e}function Xp(){let e=new H,t=Pp(`#6d5440`,!0),n=2.3;for(let[r,i]of[[-2.3,-2.3],[n,-2.3],[-2.3,n],[n,n]]){let n=Z(.3,8.6,.3,t,r*.95,4.3,i*.95);n.rotation.z=r*.012,n.rotation.x=-i*.012,e.add(n)}for(let r of[2.5,5.5])for(let[i,a,o]of[[0,-2.3,0],[0,n,0],[-2.3,0,Math.PI/2],[n,0,Math.PI/2]]){let s=Z(n*2.8,.12,.12,t,i,r,a);s.rotation.y=o,s.rotation.z=.5,e.add(s)}e.add(Z(7.2,.25,7.2,Pp(`#7a5c40`),0,8.1,0));for(let n=0;n<16;n++){let r=n/16*Math.PI*2;e.add(Z(.08,1,.08,t,Math.cos(r)*3.5,8.7,Math.sin(r)*3.5))}let r=new G(new Ya(3.5,.05,4,32),t);r.rotation.x=Math.PI/2,r.position.y=9.2,e.add(r);let i=Vp(2.9,2.9,4.6,Pp(`#8a6a4c`,!0),18,0,10.6,0);e.add(i);for(let t of[9.2,10.6,12]){let n=new G(new Ya(2.93,.06,4,32),Ip(`#3a3a3a`,{metalness:.6}));n.rotation.x=Math.PI/2,n.position.y=t,e.add(n)}let a=new G(new xi(3.2,1.8,18),Fp(`#5d4d45`));a.position.y=13.8,a.castShadow=!0,e.add(a);for(let n=.4;n<8;n+=.45)e.add(Z(.7,.06,.06,t,0,n,2.55));for(let n of[-.35,.35])e.add(Z(.07,8,.07,t,n,4,2.55));let o=Up(`DUSTY GULCH`,4.6,1.1,{bg:`#8a6a4c`,fg:`#2a1a10`,border:!1});return o.position.set(0,10.8,2.95),e.add(o),e}function Zp(){let e=new H,t=Ip(`#8f8a84`,{metalness:.5,roughness:.5});for(let[n,r]of[[-1,-1],[1,-1],[-1,1],[1,1]]){let i=Vp(.05,.07,11,t,5);i.position.set(n*.9,11/2,r*.9),i.rotation.z=-n*.1,i.rotation.x=r*.1,e.add(i)}for(let n=1.5;n<11;n+=2.2){let r=new G(new Ya((1.9-n/11*1.1)*1.2,.03,3,4),t);r.rotation.x=Math.PI/2,r.rotation.z=Math.PI/4,r.position.y=n,e.add(r)}let n=new H;n.position.y=11.3,e.add(n),n.add(Z(.4,.4,1.2,t,0,0,0));let r=Z(.05,1.2,1.9,Ip(`#d8d2c4`),0,.3,-1.6);n.add(r);let i=Up(`AERMOTOR`,1.8,.5,{bg:`#d8d2c4`,fg:`#9a2a1a`,border:!1});i.rotation.y=Math.PI/2,i.position.set(.04,.3,-1.6),n.add(i);let a=new H;a.position.z=.7,n.add(a);let o=Ip(`#e4ddd0`,{side:2});for(let e=0;e<16;e++){let t=Z(.32,1.7,.03,o,0,1.3,0),n=new H;n.rotation.z=e/16*Math.PI*2,t.rotation.y=.5,n.add(t),a.add(n)}let s=new G(new Ya(2.1,.03,3,24),t);return a.add(s),e.userData.update=e=>{a.rotation.z+=e*2.2,n.rotation.y=Math.sin(performance.now()*2e-4)*.3},e}function Qp(e){let t=new H,n=Pp(`#9c3a2a`,!0);Pp(`#efe7da`);let r=new Ra(new ea([[-6,0],[6,0],[6,5],[4.1,7.9],[0,9.4],[-4.1,7.9],[-6,5]].map(([e,t])=>new z(e,t))),{depth:16,bevelEnabled:!1}),i=r.attributes.uv;for(let e=0;e<i.count;e++)i.setXY(e,i.getX(e)/2.2,i.getY(e)/2.2);let a=new G(r,n);a.position.z=-16,a.castShadow=a.receiveShadow=!0,t.add(a);let o=Fp(`#5a4a44`),s=(e,n,r,i)=>{let a=Z(Math.hypot(r-e,i-n)+.3,.2,16.8,o,(e+r)/2,(n+i)/2+.12,-8);a.rotation.z=Math.atan2(i-n,r-e),t.add(a)};s(-6.3,4.8,-4.1,7.9),s(-4.1,7.9,0,9.4),s(0,9.4,4.1,7.9),s(4.1,7.9,6.3,4.8),t.add(Z(5,4.6,.12,Pp(`#8a3024`,!0),0,2.3,.06));let c=Ip(`#efe7da`);t.add(Z(5.2,.2,.2,c,0,4.6,.12));for(let e of[-2.5,0,2.5])t.add(Z(.2,4.6,.2,c,e,2.3,.12));for(let e of[-1,1]){let n=Z(.18,Math.hypot(2.5,4.4),.18,c,e*1.25,2.3,.14);n.rotation.z=Math.atan2(2.5,4.4)*e,t.add(n);let r=n.clone();r.rotation.z=-n.rotation.z,t.add(r)}if(t.add(Z(2,1.8,.12,Ip(`#2a1a12`),0,6.6,.06)),t.add(Z(2.3,.2,.2,c,0,7.6,.12)),t.add(Z(.2,3.5,.2,c,0,7.9,.5)),e){let n=Up(e,3.6,2.2,{bg:`#5a3a24`,fg:`#f0e2c0`,size:44});n.position.set(4.6,2.2,.2),n.rotation.z=.03,t.add(n)}return t.userData.w=12,t.userData.d=16,t}function $p(){let e=new H,t=new co({color:`#b9b4ac`,map:Mp().metal,roughness:.45,metalness:.5});e.add(Vp(2.4,2.4,13,t,20,0,6.5,0));let n=new G(new Ja(2.45,20,10,0,Math.PI*2,0,Math.PI/2),t);n.position.y=13,n.castShadow=!0,e.add(n);for(let t=2;t<13;t+=2.2){let n=new G(new Ya(2.42,.05,4,24),Ip(`#6a6560`,{metalness:.6}));n.rotation.x=Math.PI/2,n.position.y=t,e.add(n)}return e}function em(){let e=new H,t=Pp(`#dfe4df`);e.userData.wallMat=t;let n=5.5;e.add(Z(10,n,9,t,0,n/2,-9/2)),Kp(e,10,9,n,.55,Fp(`#6a4e46`)),e.add(Z(1.4,2.5,.1,Ip(`#3e5a6a`),0,1.55,.05));for(let t of[-3,3])for(let n of[1.9,4.2]){let r=Hp(1.1,1.3,Lp);r.position.set(t,n,.02),e.add(r);for(let r of[-1,1])e.add(Z(.3,1.4,.06,Ip(`#3e5a6a`),t+r*.75,n,.05))}let r=Pp(`#7a5c40`);e.add(Z(11,.3,2.6,r,0,.15,1.3));for(let t of[-5,-10/6,10/6,5])e.add(Z(.18,2.7,.18,Ip(`#efe7da`),t,1.65,2.4));let i=Z(11.4,.14,3.1,Fp(`#6a4e46`),0,3.1,1.3);return i.rotation.x=.15,e.add(i),e.add(Z(.9,3,.9,Ip(`#8a5a44`),3.5,7.7,-9/2)),e.userData.w=10,e.userData.d=9,e.userData.porch={w:11,d:2.6,top:.3},e}function tm(){let e=new H,t=Ip(`#d9ccb0`,{side:2}),n=new G(new bi(.01,2,2.4,4,1,!0),t);return n.rotation.y=Math.PI/4,n.position.y=1.2,n.scale.set(1,1,1.5),n.castShadow=!0,e.add(n),e.add(Z(.8,1.4,.02,Ip(`#2a2018`),0,.7,1.45)),e}function nm(){let e=new H,t=Pp(`#7c5a3c`);e.add(Z(1.6,.6,3.4,t,0,1.1,0));let n=new G(new bi(1,1,3.2,12,1,!0,-Math.PI/2,Math.PI),Ip(`#ece3cf`,{side:2}));n.rotation.x=Math.PI/2,n.rotation.y=Math.PI/2,n.rotation.set(0,0,0),n.rotation.z=Math.PI/2,n.rotation.y=Math.PI/2,n.position.y=1.45,n.scale.set(1,1,.9),n.castShadow=!0,e.add(n);let r=Ip(`#4a3424`);for(let[t,n,i]of[[-.9,1.1,.65],[.9,1.1,.65],[-.9,-1.1,.75],[.9,-1.1,.75]]){let a=new G(new Ya(i,.06,5,16),r);a.rotation.y=Math.PI/2,a.position.set(t,i,n),a.castShadow=!0,e.add(a);for(let a=0;a<6;a++){let o=Z(.04,i*2,.04,r,t,i,n);o.rotation.x=a/6*Math.PI,e.add(o)}}let i=Z(.1,.1,2,t,0,.7,2.6);return i.rotation.x=.3,e.add(i),e}function rm(){let e=new H,t=new bi(.38,.38,1,12,4),n=t.attributes.position;for(let e=0;e<n.count;e++){let t=1+.12*(1-(n.getY(e)/.5)**2);n.setX(e,n.getX(e)*t),n.setZ(e,n.getZ(e)*t)}t.computeVertexNormals();let r=new G(t,Pp(`#8a6038`,!0));r.position.y=.5,r.castShadow=!0,e.add(r);for(let t of[.2,.8]){let n=new G(new Ya(.42,.025,4,16),Ip(`#333`,{metalness:.6}));n.rotation.x=Math.PI/2,n.position.y=t,e.add(n)}return e}function im(){return Z(.9,.9,.9,Pp(`#a07a50`),0,.45,0,.9)}function am(){let e=new G(new bi(.75,.75,1.3,14),Ip(`#d8b664`,{roughness:1}));e.rotation.z=Math.PI/2,e.position.y=.75,e.castShadow=!0,e.receiveShadow=!0;let t=new H;return t.add(e),t}function om(){let e=new H;e.add(Z(.14,3.2,.14,Pp(`#4a3424`),0,1.6,0)),e.add(Z(.8,.1,.1,Pp(`#4a3424`),.35,3.1,0));let t=new G(new bi(.15,.18,.4,6),Bp());t.position.set(.65,2.8,0),e.add(t);let n=new G(new xi(.22,.2,6),Ip(`#222`));return n.position.set(.65,3.08,0),e.add(n),e.userData.lightPos=new V(.65,2.8,0),e}function sm(){let e=new H,t=Pp(`#6a4c34`);return e.add(Z(.15,1.1,.15,t,-1.2,.55,0)),e.add(Z(.15,1.1,.15,t,1.2,.55,0)),e.add(Z(2.7,.12,.12,t,0,1,0)),e}function cm(){let e=new H;e.add(Z(2.2,.6,.8,Pp(`#6a4c34`),0,.3,0));let t=new G(new Wa(2,.6),Ip(`#4a7f8a`,{roughness:.1}));return t.rotation.x=-Math.PI/2,t.position.y=.55,e.add(t),e}function lm(){let e=new H,t=Ip(`#8a8078`,{flatShading:!0});e.add(Vp(1,1.1,.9,t,10,0,.45,0));for(let t of[-1,1])e.add(Z(.15,2,.15,Pp(`#6a4c34`),t*.9,1.4,0));let n=Z(2.4,.12,1.6,Fp(`#5a4a44`),0,2.5,0);return e.add(n),e.add(Vp(.08,.08,1.8,Pp(`#6a4c34`),6,0,2,0)).rotation.z=Math.PI/2,e}function um(){let e=new H,t=Pp(`#7a5a3c`);e.add(Z(1.8,.08,.45,t,0,.45,0)),e.add(Z(1.8,.4,.06,t,0,.75,-.2));for(let n of[-.8,.8])e.add(Z(.08,.45,.4,t,n,.22,0));return e}function dm(e,{arrows:t=!1}={}){let n=new H,r=Pp(`#6a4c34`,!0);return n.add(Z(.2,1.4+e.length*.55,.2,r,0,(1.4+e.length*.55)/2,0)),e.forEach((r,i)=>{let a=typeof r==`string`?r:r.text,o=typeof r==`string`?0:r.dir,s=Up(a,1.9,.45,{bg:`#5c4028`,fg:`#f3e6c8`,border:!1,size:64}),c=new H;c.position.y=1.2+(e.length-i)*.55,c.rotation.y=t?o:i%2?.05:-.05,s.position.x=t?.9:0,s.position.z=.12;let l=Z(1.95,.48,.05,Pp(`#5c4028`),s.position.x,0,.08);c.add(l,s);let u=s.clone();u.rotation.y=Math.PI,u.position.z=.03,c.add(u),n.add(c)}),n}var fm=class{constructor(){this.posts=[],this.rails=[]}line(e,t,n,{spacing:r=2.8,gaps:i=[]}={}){for(let a=0;a<e.length-1;a++){let[o,s]=e[a],[c,l]=e[a+1],u=Math.hypot(c-o,l-s),d=Math.max(1,Math.round(u/r));for(let r=0;r<=d;r++){if(r===d&&a<e.length-2)continue;let u=r/d,f=o+(c-o)*u,p=s+(l-s)*u;if(!i.some(([e,t,n])=>Math.hypot(f-e,p-t)<n)&&(this.posts.push([f,t(f,p),p]),r<d)){let e=o+(c-o)*(r+1)/d,a=s+(l-s)*(r+1)/d;if(i.some(([t,n,r])=>Math.hypot(e-t,a-n)<r))continue;let u=t(f,p),m=t(e,a);if(this.rails.push([f,u,p,e,m,a]),n){let t=(f+e)/2,r=(p+a)/2,i=Math.hypot(e-f,a-p);n.addBox(t,r,i/2,.12,-Math.atan2(a-p,e-f),-1e9,Math.max(u,m)+1.1)}}}}}build(e){let t=Pp(`#7a5a3e`,!0),n=new _i(.16,1.4,.16);n.translate(0,.6,0);let r=new Br(n,t,this.posts.length),i=new ft,a=new B,o=new St,s=new V(1,1,1),c=new V,l=Bd(3);this.posts.forEach(([e,t,n],u)=>{r.setMatrixAt(u,i.compose(c.set(e,t,n),a.setFromEuler(o.set((l()-.5)*.08,l()*3,(l()-.5)*.08)),s.set(1,.9+l()*.2,1)))});let u=new Br(new _i(1,.12,.06),t,this.rails.length*2),d=0;for(let[e,t,n,r,f,p]of this.rails){let m=Math.hypot(r-e,p-n,f-t),h=-Math.atan2(p-n,r-e),g=Math.atan2(f-t,Math.hypot(r-e,p-n));for(let _ of[.55,1.05])u.setMatrixAt(d++,i.compose(c.set((e+r)/2,(t+f)/2+_+(l()-.5)*.05,(n+p)/2),a.setFromEuler(o.set(0,h,g,`YXZ`)),s.set(m+.1,1,1)))}for(let t of[r,u])t.castShadow=!0,t.receiveShadow=!0,t.computeBoundingSphere(),e.add(t)}};function pm(e,t=4.4){let n=new H,r=Pp(`#8a6a48`),i=[];for(let n=-e/2;n<e/2;n+=.42){let e=new _i(t,.12,.38);e.translate((Math.random()-.5)*.08,0,n),i.push(e)}let a=new G(kf(i),r);a.castShadow=a.receiveShadow=!0,n.add(a);for(let r of[-1,1]){n.add(Z(.25,.3,e,Pp(`#5a4230`),r*(t/2-.1),-.2,0));for(let i=-e/2;i<=e/2+.01;i+=e/5)n.add(Z(.14,1.1,.14,Pp(`#5a4230`),t/2*r,.55,i)),n.add(Z(.3,3.5,.3,Pp(`#4a3424`),r*(t/2-.3),-1.9,i));n.add(Z(.1,.12,e,Pp(`#6a4c34`),t/2*r,1.05,0))}return n}var mm=class{constructor(e,{max:t=400,additive:n=!1,fog:r=!0}={}){this.max=t,this.pos=new Float32Array(t*3),this.col=new Float32Array(t*4),this.size=new Float32Array(t),this.list=[];let i=new Hn;i.setAttribute(`position`,new On(this.pos,3).setUsage(ae)),i.setAttribute(`aCol`,new On(this.col,4).setUsage(ae)),i.setAttribute(`aSize`,new On(this.size,1).setUsage(ae)),this.geo=i;let a=new oo({transparent:!0,depthWrite:!1,fog:r,blending:n?2:1,uniforms:ro.merge([K.fog,{uScale:{value:400}}]),vertexShader:`
        #include <fog_pars_vertex>
        attribute vec4 aCol; attribute float aSize; uniform float uScale;
        varying vec4 vCol;
        void main(){
          vCol = aCol;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uScale / -mvPosition.z;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,fragmentShader:`
        #include <common>
        #include <fog_pars_fragment>
        varying vec4 vCol;
        void main(){
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(vCol.rgb, vCol.a * a);
          #include <fog_fragment>
        }`});this.points=new ui(i,a),this.points.frustumCulled=!1,this.points.renderOrder=5,e.add(this.points)}emit(e){this.list.length>=this.max&&this.list.shift(),this.list.push({x:e.x,y:e.y,z:e.z,vx:e.vx||0,vy:e.vy||0,vz:e.vz||0,life:e.life||1,age:0,size0:e.size||1,size1:e.size1??e.size??1,r:e.r??1,g:e.g??1,b:e.b??1,a:e.a??1,grav:e.grav||0,drag:e.drag??.5,fadeIn:e.fadeIn||.1})}update(e){let t=this.list;for(let n=t.length-1;n>=0;n--){let r=t[n];if(r.age+=e,r.age>=r.life){t.splice(n,1);continue}r.vy+=r.grav*e;let i=Math.exp(-r.drag*e);r.vx*=i,r.vz*=i,r.x+=r.vx*e,r.y+=r.vy*e,r.z+=r.vz*e}for(let e=0;e<this.max;e++){let n=t[e];if(!n){this.col[e*4+3]=0,this.size[e]=0;continue}let r=n.age/n.life;this.pos[e*3]=n.x,this.pos[e*3+1]=n.y,this.pos[e*3+2]=n.z;let i=Math.min(1,r/n.fadeIn)*(1-r);this.col[e*4]=n.r,this.col[e*4+1]=n.g,this.col[e*4+2]=n.b,this.col[e*4+3]=n.a*i,this.size[e]=n.size0+(n.size1-n.size0)*r}this.geo.attributes.position.needsUpdate=!0,this.geo.attributes.aCol.needsUpdate=!0,this.geo.attributes.aSize.needsUpdate=!0}},hm=new oo({transparent:!0,depthWrite:!1,blending:2,side:2,uniforms:{uTime:{value:0}},vertexShader:`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,fragmentShader:`
    uniform float uTime; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
    float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
      return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
    void main(){
      vec2 uv = vUv;
      float t = uTime;
      float nn = n(vec2(uv.x*4.0, uv.y*3.0 - t*3.0)) * 0.6 + n(vec2(uv.x*8.0, uv.y*6.0 - t*5.0)) * 0.4;
      float shape = 1.0 - smoothstep(0.0, 0.5, abs(uv.x - 0.5) * (1.3 + uv.y*2.2));
      float f = shape * (1.0 - uv.y) * 1.8 * nn;
      f = smoothstep(0.15, 0.9, f);
      vec3 col = mix(vec3(1.0,0.25,0.02), vec3(1.0,0.85,0.4), f);
      gl_FragColor = vec4(col * f * 2.5, f);
    }`}),gm=class{constructor(e,t,n,r,{scale:i=1,light:a=!0,logs:o=!0}={}){this.group=new H,this.group.position.set(t,n,r),e.add(this.group);for(let e=0;e<3;e++){let t=new G(new Wa(.9*i,1.3*i),hm);t.position.y=.6*i,t.rotation.y=e/3*Math.PI,this.group.add(t)}if(o){let e=new co({color:`#4a3020`,roughness:.9});for(let t=0;t<4;t++){let n=new G(new bi(.07,.08,.9*i,6),e);n.rotation.z=Math.PI/2-.3,n.rotation.y=t/4*Math.PI*2,n.position.y=.12,n.castShadow=!0,this.group.add(n)}let t=new co({color:`#77706a`,roughness:1,flatShading:!0});for(let e=0;e<9;e++){let n=new G(new Ci(.14*i,0),t),r=e/9*Math.PI*2;n.position.set(Math.cos(r)*.6*i,.05,Math.sin(r)*.6*i),this.group.add(n)}}a&&(this.light=new ms(`#ffb070`,6*i,14*i,1.8),this.light.position.y=.9*i,this.group.add(this.light)),this.t=Math.random()*10,this.scale=i,this.world=new V(t,n,r)}update(e,t){this.t+=e,hm.uniforms.uTime.value=performance.now()/1e3,this.light&&(this.light.intensity=this.off?0:6*this.scale*(.8+.2*Math.sin(this.t*13)*Math.sin(this.t*7.3))),!this.off&&t&&Math.random()<e*6&&t.emit({x:this.world.x+(Math.random()-.5)*.4,y:this.world.y+.6,z:this.world.z+(Math.random()-.5)*.4,vx:(Math.random()-.5)*.4,vy:1.2+Math.random(),vz:(Math.random()-.5)*.4,life:1.5+Math.random(),size:.08,size1:.02,r:1,g:.6,b:.2,a:1,drag:.2})}};function _m(e=`#7dffc8`,t=60){let n=new oo({transparent:!0,depthWrite:!1,blending:2,side:2,uniforms:{uColor:{value:new U(e)},uTime:{value:0}},vertexShader:`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,fragmentShader:`uniform vec3 uColor; uniform float uTime; varying vec2 vUv;
      void main(){ float a = (1.0 - vUv.y) * (0.55 + 0.45*sin(vUv.y*40.0 - uTime*3.0)) * 0.35;
        gl_FragColor = vec4(uColor * a, a); }`}),r=new G(new bi(.35,.6,t,12,1,!0),n);return r.position.y=t/2,r.userData.mat=n,r}function vm(e,t,n,r,i=0,a=null){return t.position.set(n,a??X(n,r),r),t.rotation.y=i,e.add(t),t}function ym(e,t){let n=[],r={},i=[],a=[],o=-110,s=[{x:-230,w:11,sign:`HOTEL`,color:`#8f6a4a`,twoStory:!0},{x:-217.5,w:9,sign:`BANK`,color:`#9a8f80`,signBg:`#1e2a24`},{x:-204,w:13,sign:`SALOON`,color:`#7c5436`,twoStory:!0,saloonDoors:!0,signBg:`#2a1a10`},{x:-192,w:7,sign:`BARBER`,color:`#a58a6a`,signBg:`#6a1e1e`},{x:-181,w:11,sign:`GENERAL STORE`,color:`#9c7a58`}],c=[{x:-229,w:9,sign:`SHERIFF`,color:`#8a7456`,signBg:`#1a1a1a`},{x:-218.5,w:8,sign:`POST OFFICE`,color:`#b08e6e`},{x:-208.5,w:8,sign:`ASSAY OFFICE`,color:`#8e6e50`},{x:-199,w:7,sign:`UNDERTAKER`,color:`#6e6258`,signBg:`#111`},{x:-188.5,w:10,sign:`FEED & SEED`,color:`#a67c52`,signBg:`#3a4a2a`},{x:-177,w:8,sign:`DOCTOR`,color:`#c9c0b0`,signBg:`#2a3a5a`}],l=X(-200,o);r.buildings={};for(let n of s){let i=qp({w:n.w,d:14,sign:n.sign,color:n.color,twoStory:n.twoStory,saloonDoors:n.saloonDoors,signBg:n.signBg});vm(e,i,n.x,-119,0,l),Jp(i,t),r.buildings[n.sign]=i}for(let n of c){let i=qp({w:n.w,d:12,sign:n.sign,color:n.color,signBg:n.signBg});vm(e,i,n.x,-101,Math.PI,l),Jp(i,t),r.buildings[n.sign]=i}let u=r.buildings.SALOON;if(u.userData.saloonDoors){let e=u.userData.saloonDoors,t=new V(-204,l,-118.2);r.saloonDoor=t;let i=0;n.push((n,r)=>{let a=r.player?r.player.pos.distanceTo(t):99;i+=(+(a<2.2)-i)*Math.min(1,n*5);let o=performance.now()/1e3;e[0].rotation.y=i*(1.1+Math.sin(o*7)*.08*i),e[1].rotation.y=-i*(1.1+Math.sin(o*7)*.08*i)})}vm(e,dm([`GOOD PEOPLE`,`STRANGE`,`STORIES`]),-196.8,-115.4,.2,l+.3);{let n=new H,r=Pp(`#6a5038`,!0);for(let[e,t]of[[-4,0],[4,0],[-4,-6],[4,-6]])n.add(Z(.3,3.6,.3,r,e,1.8,t));let i=Z(9.4,.2,7.4,Fp(`#5a5048`),0,3.8,-3);i.rotation.x=.12,n.add(i),n.add(Z(1.2,.9,.7,Ip(`#3a3a3c`,{metalness:.7,roughness:.4}),1.5,.75,-3)),n.add(Z(1.8,1,1.4,Ip(`#6a4a3a`,{flatShading:!0}),-2,.5,-4)),vm(e,n,-167,-118,0,l);for(let[e,r]of[[-4,0],[4,0],[-4,-6],[4,-6]])Wp(n,t,e,r,.2,.2);Wp(n,t,-2,-4,.9,.7),Wp(n,t,1.5,-3,.6,.35);let o=new gm(e,-169,l+1,-122,{scale:.5,light:!1,logs:!1});a.push(o)}{let n=Yp();vm(e,n,-128,-95,Math.PI,l),Wp(n,t,0,-7.5,4.7,7.7),Wp(n,t,0,-.4,1.7,1.7)}{let n=Xp(),i=-152;vm(e,n,i,-93,0,l);for(let[e,n]of[[-2.2,-2.2],[2.2,-2.2],[-2.2,2.2],[2.2,2.2]])t.addCircle(i+e,-93+n,.25);t.addPlatform(i,-93,3.6,3.6,0,l+8.23),t.addCircle(i,-93,2.95,l+8.3,l+14),r.waterTowerTop=new V(-149.1,l+8.23,-91.5)}{let r=Zp();vm(e,r,-250,-92,.4,l),n.push(e=>r.userData.update(e)),t.addCircle(-250,-92,1.2),vm(e,lm(),-190,o,0,l),t.addCircle(-190,o,1.15)}[[-236,-114.6],[-222,-105.4],[-210,-114.6],[-196,-105.4],[-184,-114.6],[-170,-105.4]].forEach(([n,r],a)=>{let s=om();if(vm(e,s,n,r,r<o?-Math.PI/2:Math.PI/2,l),t.addCircle(n,r,.15),a%2==0){let t=new ms(`#ffb862`,0,16,1.6),n=s.userData.lightPos.clone().applyMatrix4(s.matrixWorld.compose(s.position,s.quaternion,s.scale));t.position.copy(n),e.add(t),i.push(t)}});for(let[n,r,i]of[[-212,-113.2,0],[-199,-106.8,0],[-186,-113.2,0]]){let a=sm();vm(e,a,n,r,i,l),Wp(a,t,0,0,1.35,.1,-1e9,l+1.1)}for(let[n,r]of[[-224.5,-116.5],[-209.8,-117],[-196.2,-117.3],[-176,-103.4],[-184,-103.5],[-239,-104]])vm(e,rm(),n,r,Math.random()*6,l+(Math.abs(r-o)>6?.3:0)),t.addCircle(n,r,.42);for(let[n,r]of[[-172.5,-117.2],[-171.6,-116.5]])vm(e,im(),n,r,Math.random(),l+.3),t.addCircle(n,r,.55);vm(e,cm(),-205,-106.5,0,l),t.addBox(-205,-106.5,1.1,.4,0),vm(e,um(),-226,-117.4,0,l+.3),r.benchTown=new V(-226,l+.3,-117.4);{let n=dm([`DUSTY GULCH`,`POP. 42`]);vm(e,n,-140,-101,-Math.PI/2+.3),r.popSign=n,t.addCircle(-140,-101,.2)}{let n={cans:[],shooter:new V(-146,0,-121)};n.shooter.y=X(n.shooter.x,n.shooter.z);let i=-136,a=new fm;a.line([[-153,i],[-139,i]],X,t,{spacing:2.33}),a.build(e);for(let e=0;e<8;e++){let t=-152+12/7*e;n.cans.push(new V(t,X(t,i)+1.15,i))}vm(e,dm([`TARGET`,`PRACTICE`]),-155,-132,.3),r.range=n}r.town={sheriff:new V(-229,l,-105.2),clementine:new V(-201.5,l,-114.8),otis:new V(-181,l,-114.8),y:l};let d=X(Y.ranch.x,Y.ranch.z);{let r=em();vm(e,r,178,-46,Math.PI,d),Wp(r,t,0,-4.5,5.2,4.7),Gp(r,t,0,1.3,5.5,1.3,.3);let i=Qp(`SOME LANDS
WELCOME
DIFFERENT
DREAMERS`);vm(e,i,207,-96,0,d),Wp(i,t,0,-8,6.1,8.1),vm(e,$p(),218.5,-104,0,d),t.addCircle(218.5,-104,2.5);let a=Zp();vm(e,a,172,-92,-.5,d),n.push(e=>a.userData.update(e)),t.addCircle(172,-92,1.2),vm(e,cm(),175.5,-89,.3,d),t.addBox(175.5,-89,1.1,.4,.3);let o=nm();vm(e,o,192,-46,1.2,d),Wp(o,t,0,0,.9,1.8);for(let[n,r]of[[198,-86],[199.6,-86.4],[214,-88],[228,-95],[229.5,-93.5]])vm(e,am(),n,r,Math.random()*3,d),t.addCircle(n,r,.8)}let f=new fm;{let n=[];for(let e=0;e<=20;e++){let t=e/20*Math.PI*2;n.push([158+Math.cos(t)*10,-72+Math.sin(t)*10])}f.line(n,X,t,{spacing:3.2,gaps:[[168,-72,2.2]]}),r.corral=new V(158,X(158,-72),-72),vm(e,dm([`PRACTICE`,`PATIENCE`,`PROGRESS`,`BELONGING`]),169.5,-76,-1.2),t.addCircle(169.5,-76,.2)}f.line([[218,-70],[236,-70],[236,-56],[218,-56],[218,-70]],X,t,{spacing:2.4,gaps:[[218,-63,2.6]]}),r.pen={x0:218.5,x1:235.5,z0:-69.5,z1:-56.5,gate:new V(216.5,d,-63)},r.ranch={ma:new V(183,d,-56),y:d};{let e=af.paths[0],n=[],r=[];for(let t of e)t.x<60||t.x>175||(n.push([t.x,t.z-6]),r.push([t.x,t.z+6]));let i=e=>e.filter((e,t)=>t%3==0);f.line(i(n),X,t,{spacing:3}),f.line(i(r),X,t,{spacing:3})}{let n=X(Y.mine.x,Y.mine.z),i=new H,o=Pp(`#5a4230`,!0);i.add(Z(.4,3.2,.4,o,-1.8,1.6,0),Z(.4,3.2,.4,o,1.8,1.6,0),Z(4.6,.45,.5,o,0,3.3,0));let s=Ip(`#7d7068`,{flatShading:!0});for(let e of[-1,1])i.add(Z(1.2,3.4,9,s,e*2.6,1.7,-4.5));i.add(Z(6.4,1.5,9.5,s,0,4.1,-4.5)),i.add(Z(6.4,3.8,1,s,0,1.9,-9));let c=new G(new Wa(3.6,3.2),new rr({color:`#0a0806`}));c.position.set(0,1.6,-8.4),i.add(c);let l=new G(new Va(9,1),s);l.scale.set(1.2,.75,1.1),l.position.set(0,1.5,-13.5),l.castShadow=l.receiveShadow=!0,i.add(l);let u=Up(`SILVER SPUR MINE`,4.2,.9,{bg:`#4a3222`});u.position.set(0,4.1,.3),i.add(u);for(let e=-8;e<7;e+=.7)i.add(Z(1.4,.08,.18,o,0,.04,e));for(let e of[-.5,.5])i.add(Z(.06,.08,15,Ip(`#666`,{metalness:.8}),e,.12,-.5));let d=new H;d.add(Z(1.1,.6,1.4,Ip(`#5a5a5e`,{metalness:.6,roughness:.5}),0,.6,0));for(let[e,t]of[[-.5,-.45],[.5,-.45],[-.5,.45],[.5,.45]]){let n=new G(new bi(.18,.18,.08,10),Ip(`#333`));n.rotation.z=Math.PI/2,n.position.set(e,.2,t),d.add(n)}d.add(Z(.9,.3,1.1,Ip(`#8a8278`,{flatShading:!0}),0,.95,0)),d.position.set(0,0,3),i.add(d);let f=new ms(`#ffb060`,6,10,1.5);f.position.set(0,2.6,-5),i.add(f),vm(e,i,-334,318,Math.PI,n),Wp(i,t,-2.6,-4.5,.6,4.5),Wp(i,t,2.6,-4.5,.6,4.5),Wp(i,t,0,-9,3.2,.5),Wp(i,t,-6.5,-8,3.5,6),Wp(i,t,6.5,-8,3.5,6),Wp(i,t,0,-14,9,3),Wp(i,t,0,3,.6,.75),i.updateMatrixWorld(!0),r.mineInside=new V(0,0,-7).applyMatrix4(i.matrixWorld),vm(e,tm(),-318,303,-.8,n),t.addCircle(-318,303,1.8);let p=new gm(e,-324,n+.02,296);a.push(p),t.addCircle(-324,296,.6);for(let[t,r]of[[-328,293.5],[-320,293.5]])vm(e,Z(1.6,.35,.35,Pp(`#6a4a32`),0,.18,0),t,r,(t+324)*.3,n);for(let[r,i]of[[-340,305],[-341,306.2],[-312,296]])vm(e,im(),r,i,Math.random(),n),t.addCircle(r,i,.55);r.mine={pete:new V(-326.5,n,298.5),y:n,fire:new V(-324,n,296)}}{let n=Y.crash,i=new H,o=Z(.12,2.4,.12,Pp(`#6a4a32`,!0),0,1.2,0),s=Z(1.6,.1,.1,Pp(`#6a4a32`,!0),0,1.9,0),c=new G(new Ja(.25,10,8),Ip(`#c8b088`));c.position.y=2.35;let l=Z(.7,.7,.3,Ip(`#7a3a2a`),0,1.65,0);i.add(o,s,c,l),i.rotation.z=Math.PI/2-.15,vm(e,i,n.x-7,n.z+13,0),i.rotation.set(0,.8,Math.PI/2-.12),i.position.y+=.2,r.hatSpot=new V(n.x-6.2,0,n.z+11.2),r.hatSpot.y=X(r.hatSpot.x,r.hatSpot.z);let u=n.x+11,d=n.z-10,f=new gm(e,u,X(u,d)+.02,d);f.nightOnly=!0,a.push(f),t.addCircle(u,d,.6),vm(e,Z(1.8,.35,.35,Pp(`#6a4a32`),0,.18,0),u-1.4,d+1.2,.5),vm(e,im(),u+2,d+.5,.3),t.addCircle(u+2,d+.5,.55),r.crashCamp=new V(u,X(u,d),d)}{let n=Y.lookout;vm(e,dm([`FURTHER`,`KINDER`,`STRANGER`,`BELONGS HERE TOO`]),n.x-2,n.z+3,2.4),t.addCircle(n.x-2,n.z+3,.2),vm(e,um(),n.x+1,n.z+4.5,2.6),r.lookout=new V(n.x,X(n.x,n.z),n.z)}vm(e,dm([{text:`DUSTY GULCH`,dir:Math.PI-.2},{text:`McCREADY RANCH`,dir:.1},{text:`CRASH? NO SIR`,dir:-Math.PI/2}],{arrows:!0}),-24,-86,0),t.addCircle(-24,-86,.2),vm(e,dm([{text:`SILVER SPUR MINE`,dir:Math.PI/2+.3},{text:`DUSTY GULCH`,dir:-Math.PI/2}],{arrows:!0}),-268,-60,0),vm(e,dm([{text:`LAKE SERENITY`,dir:Math.PI/2},{text:`McCREADY RANCH`,dir:-Math.PI/2-.2}],{arrows:!0}),211,20,0);for(let n of af.paths){let r=null;for(let e=0;e<n.length;e++){let t=n[e],i=rf.dist(t.x,t.z);i<7.2&&(!r||i<r.d)&&(r={d:i,i:e,p:t})}if(!r)continue;let i=n[Math.max(0,r.i-2)],a=n[Math.min(n.length-1,r.i+2)],o=Math.atan2(a.x-i.x,a.z-i.z),s=9*2.6,c=Math.sin(o)*s/2,l=Math.cos(o)*s/2,u=Math.max(X(r.p.x+c,r.p.z+l),X(r.p.x-c,r.p.z-l),2)+.15;vm(e,pm(s),r.p.x,r.p.z,o,u),t.addPlatform(r.p.x,r.p.z,2.2,s/2,o,u+.06);for(let e of[-1,1]){let n=new V(e*2.25,0,0).applyAxisAngle(new V(0,1,0),o);t.addBox(r.p.x+n.x,r.p.z+n.z,.1,s/2,o,u-.5,u+1.2)}}return f.build(e),{updaters:n,anchors:r,lights:i,fires:a}}var bm=16,xm=(e,t)=>e*73856093^t*19349663,Sm=class{constructor(){this.grid=new Map,this.platforms=[],this.dynamic=new Set}_insert(e,t,n,r,i){for(let a=Math.floor(t/bm);a<=Math.floor(n/bm);a++)for(let t=Math.floor(r/bm);t<=Math.floor(i/bm);t++){let n=xm(a,t),r=this.grid.get(n);r||this.grid.set(n,r=[]),r.push(e)}}addCircle(e,t,n,r=-1e9,i=1e9){let a={type:`c`,x:e,z:t,r:n,yMin:r,yMax:i};return this._insert(a,e-n,e+n,t-n,t+n),a}addBox(e,t,n,r,i=0,a=-1e9,o=1e9){let s={type:`b`,x:e,z:t,hw:n,hd:r,rot:i,cos:Math.cos(-i),sin:Math.sin(-i),yMin:a,yMax:o},c=Math.hypot(n,r);return this._insert(s,e-c,e+c,t-c,t+c),s}addPlatform(e,t,n,r,i,a){let o={x:e,z:t,hw:n,hd:r,rot:i,cos:Math.cos(-i),sin:Math.sin(-i),top:a};return this.platforms.push(o),o}platformHeight(e,t,n){let r=-1/0;for(let i of this.platforms){let a=e-i.x,o=t-i.z,s=a*i.cos+o*i.sin,c=-a*i.sin+o*i.cos;Math.abs(s)<=i.hw&&Math.abs(c)<=i.hd&&n>=i.top-.6&&i.top>r&&(r=i.top)}return r}blocksCamera(e,t,n){let r=this.grid.get(xm(Math.floor(e/bm),Math.floor(n/bm)));if(!r)return!1;for(let i of r)if(!(t>i.yMax||t<i.yMin)){if(i.type===`c`){if(i.r>1.2&&Math.hypot(e-i.x,n-i.z)<i.r+.2)return!0}else if(i.hw>.8&&i.hd>.8){let t=e-i.x,r=n-i.z,a=t*i.cos+r*i.sin,o=-t*i.sin+r*i.cos;if(Math.abs(a)<i.hw+.25&&Math.abs(o)<i.hd+.25)return!0}}return!1}resolve(e,t,n=0,r=1.8){let i=Math.floor(e.x/bm),a=Math.floor(e.z/bm),o=new Set;for(let s=-1;s<=1;s++)for(let c=-1;c<=1;c++){let l=this.grid.get(xm(i+s,a+c));if(l)for(let i of l)o.has(i)||(o.add(i),this._push(i,e,t,n,r))}for(let i of this.dynamic)i.ignore||i.owner===e||this._push(i,e,t,n,r)}_push(e,t,n,r,i){if(!(r>e.yMax||r+i<e.yMin)){if(e.type===`c`){let r=t.x-e.x,i=t.z-e.z,a=Math.hypot(r,i),o=e.r+n;a<o&&a>1e-5&&(t.x=e.x+r/a*o,t.z=e.z+i/a*o)}else{let r=t.x-e.x,i=t.z-e.z,a=r*e.cos+i*e.sin,o=-r*e.sin+i*e.cos,s=Math.max(-e.hw,Math.min(e.hw,a)),c=Math.max(-e.hd,Math.min(e.hd,o)),l=a-s,u=o-c,d=Math.hypot(l,u),f,p;if(d<1e-5)e.hw-Math.abs(a)<e.hd-Math.abs(o)?(f=Math.sign(a)*(e.hw+n),p=o):(f=a,p=Math.sign(o)*(e.hd+n));else if(d<n)f=s+l/d*n,p=c+u/d*n;else return;t.x=e.x+f*e.cos-p*e.sin,t.z=e.z+f*e.sin+p*e.cos}}}};function Cm(e){let t=new H,n=new lo({color:`#c9ced4`,metalness:1,roughness:.28,envMap:e,envMapIntensity:1.2,clearcoat:.6}),r=new co({color:`#50565e`,metalness:.8,roughness:.4,envMap:e}),i=new co({color:`#0c3a3a`,emissive:`#48ffd8`,emissiveIntensity:2.2}),a=new lo({color:`#7de8d8`,emissive:`#1aa89a`,emissiveIntensity:.7,metalness:0,roughness:.05,transmission:.4,transparent:!0,opacity:.75,envMap:e,clearcoat:1}),o=new G(new Ha([[0,-.7],[1,-.66],[2.4,-.45],[3.6,-.15],[4.3,.02],[4.35,.1],[3.8,.3],[2.6,.62],[1.6,.78],[0,.8]].map(([e,t])=>new z(e,t)),64),n);o.castShadow=o.receiveShadow=!0,t.add(o);let s=new G(new Ya(4.33,.07,6,64),r);s.rotation.x=Math.PI/2,s.position.y=.06,t.add(s);let c=[];for(let e=0;e<18;e++){let n=e/18*Math.PI*2,r=new G(new Ja(.12,10,8),i.clone());r.position.set(Math.cos(n)*4,.2,Math.sin(n)*4),t.add(r),c.push(r)}let l=new G(new Ja(1.7,32,16,0,Math.PI*2,0,Math.PI/2),a);l.position.y=.72,l.scale.y=.8,t.add(l);let u=new G(new Ya(1.1,.12,8,32),i);u.rotation.x=Math.PI/2,u.position.y=-.66,t.add(u);let d=new G(new bi(.35,.4,.5,12),r);d.position.y=1,t.add(d);let f=new H;for(let e=0;e<3;e++){let t=e/3*Math.PI*2+.5,n=new G(new bi(.06,.08,1.4,6),r);n.position.set(Math.cos(t)*2.2,-1.1,Math.sin(t)*2.2),n.rotation.z=Math.cos(t)*.3,n.rotation.x=-Math.sin(t)*.3;let i=new G(new bi(.28,.32,.08,10),r);i.position.set(Math.cos(t)*2.45,-1.78,Math.sin(t)*2.45),f.add(n,i)}t.add(f);let p=new ms(`#5cffd8`,0,18,1.5);return p.position.y=-1.2,t.add(p),{group:t,lights:c,dome:l,legs:f,light:p,glowMat:i,hull:n,t:0,update(e,{flying:t=!1,crashed:n=!0,speed:r=0}={}){this.t+=e,c.forEach((e,t)=>{let r=n?(Math.sin(this.t*3+t*1.7)>.6?1:.1)*(t%3==0?1:.2):.5+.5*Math.sin(this.t*6-t*.7);e.material.emissiveIntensity=.3+r*3}),l.material.emissiveIntensity=n?.35+Math.random()*.1:.9,p.intensity=n?3:20,f.visible=!t}}}var wm=new V,Tm=new V,Em=new V,Dm=class{constructor(e){Object.assign(this,{wrap:!1,memory:()=>.02,stiffness:1,iterations:4,drag:.985,gravity:-9.8},e);let{cols:t,rows:n}=this;this.n=t*n,this.pos=new Float32Array(this.n*3),this.prev=new Float32Array(this.n*3),this.restLocal=[],this.pin=new Uint8Array(this.n),this.mem=new Float32Array(this.n);for(let e=0;e<n;e++)for(let n=0;n<t;n++){let r=e*t+n;this.restLocal[r]=this.rest(n,e),this.pin[r]=+!!this.pinned(n,e),this.mem[r]=this.memory(e,n)}let r=[],i=(e,t)=>{let n=this.restLocal[e].distanceTo(this.restLocal[t]);r.push(e,t,n)},a=(e,n)=>n*t+(e%t+t)%t,o=this.wrap?t:t-1;for(let e=0;e<n;e++)for(let r=0;r<t;r++)r<o&&i(a(r,e),a(r+1,e)),e<n-1&&i(a(r,e),a(r,e+1)),e<n-1&&r<o&&(i(a(r,e),a(r+1,e+1)),i(a(r+1,e),a(r,e+1))),e<n-2&&i(a(r,e),a(r,e+2));this.cons=new Float32Array(r);let s=new Hn;this.attr=new On(new Float32Array(this.n*3),3).setUsage(ae),s.setAttribute(`position`,this.attr);let c=new Float32Array(this.n*2);for(let e=0;e<n;e++)for(let r=0;r<t;r++){let i=e*t+r,[a,o]=this.uv?this.uv(r,e):[r/(t-1),1-e/(n-1)];c[i*2]=a,c[i*2+1]=o}s.setAttribute(`uv`,new On(c,2));let l=[];for(let e=0;e<n-1;e++)for(let t=0;t<o;t++){let n=a(t,e),r=a(t+1,e),i=a(t,e+1),o=a(t+1,e+1);l.push(n,i,r,r,i,o)}s.setIndex(l),this.mesh=new G(s,this.material),this.mesh.castShadow=!0,this.mesh.receiveShadow=!0,this.mesh.frustumCulled=!1,this.initialized=!1,this.t=0}reset(){this.anchor.updateWorldMatrix(!0,!1);let e=this.anchor.matrixWorld;for(let t=0;t<this.n;t++)wm.copy(this.restLocal[t]).applyMatrix4(e),this.pos[t*3]=this.prev[t*3]=wm.x,this.pos[t*3+1]=this.prev[t*3+1]=wm.y,this.pos[t*3+2]=this.prev[t*3+2]=wm.z;this.initialized=!0}step(e,t){this.initialized||this.reset(),this.t+=e;let n=this.anchor.matrixWorld;wm.copy(this.restLocal[0]).applyMatrix4(n),Math.abs(wm.x-this.pos[0])+Math.abs(wm.y-this.pos[1])+Math.abs(wm.z-this.pos[2])>3&&this.reset();let r=Math.min(e,1/30)/2,i=this.colliders?this.colliders():[],a=this.pos,o=this.prev,s=this.n,c=t?.6+.4*Math.sin(this.t*1.7)*Math.sin(this.t*.63):0;for(let e=0;e<2;e++){for(let e=0;e<s;e++){let i=e*3;if(this.pin[e]){wm.copy(this.restLocal[e]).applyMatrix4(n),a[i]=o[i]=wm.x,a[i+1]=o[i+1]=wm.y,a[i+2]=o[i+2]=wm.z;continue}let s=a[i],l=a[i+1],u=a[i+2],d=0,f=this.gravity,p=0;if(t){let n=Math.sin(this.t*7+e*.7)*.5;d+=t.x*(c+n*.3),p+=t.z*(c+n*.3)}a[i]=s+(s-o[i])*this.drag+d*r*r,a[i+1]=l+(l-o[i+1])*this.drag+f*r*r,a[i+2]=u+(u-o[i+2])*this.drag+p*r*r,o[i]=s,o[i+1]=l,o[i+2]=u}for(let e=0;e<this.iterations;e++){let e=this.cons;for(let t=0;t<e.length;t+=3){let n=e[t]*3,r=e[t+1]*3,i=e[t+2],o=a[r]-a[n],s=a[r+1]-a[n+1],c=a[r+2]-a[n+2],l=Math.sqrt(o*o+s*s+c*c)||1e-6,u=(l-i)/l*.5*this.stiffness,d=this.pin[e[t]],f=this.pin[e[t+1]];if(d&&f)continue;let p=d?0:f?1:.5,m=f?0:d?1:.5;a[n]+=o*u*2*p,a[n+1]+=s*u*2*p,a[n+2]+=c*u*2*p,a[r]-=o*u*2*m,a[r+1]-=s*u*2*m,a[r+2]-=c*u*2*m}for(let e=0;e<s;e++){let t=this.mem[e];if(!t||this.pin[e])continue;wm.copy(this.restLocal[e]).applyMatrix4(n);let r=e*3;a[r]+=(wm.x-a[r])*t,a[r+1]+=(wm.y-a[r+1])*t,a[r+2]+=(wm.z-a[r+2])*t}for(let e of i){Tm.copy(e.a),Em.copy(e.b).sub(e.a);let t=Em.lengthSq()||1e-6;for(let n=0;n<s;n++){if(this.pin[n])continue;let r=n*3,i=a[r]-Tm.x,o=a[r+1]-Tm.y,s=a[r+2]-Tm.z,c=(i*Em.x+o*Em.y+s*Em.z)/t;c=c<0?0:c>1?1:c;let l=Tm.x+Em.x*c,u=Tm.y+Em.y*c,d=Tm.z+Em.z*c,f=a[r]-l,p=a[r+1]-u,m=a[r+2]-d,h=f*f+p*p+m*m;if(h<e.r*e.r){let t=Math.sqrt(h)||1e-6,n=e.r/t;a[r]=l+f*n,a[r+1]=u+p*n,a[r+2]=d+m*n}}}if(this.floorY!==void 0)for(let e=0;e<s;e++)a[e*3+1]<this.floorY&&(a[e*3+1]=this.floorY)}}this.attr.array.set(a),this.attr.needsUpdate=!0,this.mesh.geometry.computeVertexNormals(),this.mesh.geometry.computeBoundingSphere()}};function Om(e){let t=new Map,n=new Map,r=e.clone();return km(e,r,function(e,r){t.set(r,e),n.set(e,r)}),r.traverse(function(e){if(!e.isSkinnedMesh)return;let r=e,i=t.get(e),a=i.skeleton.bones;r.skeleton=i.skeleton.clone(),r.bindMatrix.copy(i.bindMatrix),r.skeleton.bones=a.map(function(e){return n.get(e)}),r.bind(r.skeleton,r.bindMatrix)}),r}function km(e,t,n){n(e,t);for(let r=0;r<e.children.length;r++)km(e.children[r],t.children[r],n)}var Am=class extends Wo{constructor(e){super(e),this.dracoLoader=null,this.ktx2Loader=null,this.meshoptDecoder=null,this.pluginCallbacks=[],this.register(function(e){return new Lm(e)}),this.register(function(e){return new Rm(e)}),this.register(function(e){return new qm(e)}),this.register(function(e){return new Jm(e)}),this.register(function(e){return new Ym(e)}),this.register(function(e){return new Bm(e)}),this.register(function(e){return new Vm(e)}),this.register(function(e){return new Hm(e)}),this.register(function(e){return new Um(e)}),this.register(function(e){return new Im(e)}),this.register(function(e){return new Wm(e)}),this.register(function(e){return new zm(e)}),this.register(function(e){return new Km(e)}),this.register(function(e){return new Gm(e)}),this.register(function(e){return new Pm(e)}),this.register(function(e){return new Xm(e,Nm.EXT_MESHOPT_COMPRESSION)}),this.register(function(e){return new Xm(e,Nm.KHR_MESHOPT_COMPRESSION)}),this.register(function(e){return new Zm(e)})}load(e,t,n,r){let i=this,a;if(this.resourcePath!==``)a=this.resourcePath;else if(this.path!==``){let t=vs.extractUrlBase(e);a=vs.resolveURL(t,this.path)}else a=vs.extractUrlBase(e);this.manager.itemStart(e);let o=function(t){r?r(t):console.error(t),i.manager.itemError(e),i.manager.itemEnd(e)},s=new qo(this.manager);s.setPath(this.path),s.setResponseType(`arraybuffer`),s.setRequestHeader(this.requestHeader),s.setWithCredentials(this.withCredentials),s.load(e,function(n){try{i.parse(n,a,function(n){t(n),i.manager.itemEnd(e)},o)}catch(e){o(e)}},n,o)}setDRACOLoader(e){return this.dracoLoader=e,this}setKTX2Loader(e){return this.ktx2Loader=e,this}setMeshoptDecoder(e){return this.meshoptDecoder=e,this}register(e){return this.pluginCallbacks.indexOf(e)===-1&&this.pluginCallbacks.push(e),this}unregister(e){return this.pluginCallbacks.indexOf(e)!==-1&&this.pluginCallbacks.splice(this.pluginCallbacks.indexOf(e),1),this}parse(e,t,n,r){let i,a={},o={},s=new TextDecoder;if(typeof e==`string`)i=JSON.parse(e);else if(e instanceof ArrayBuffer){if(s.decode(new Uint8Array(e,0,4))===Qm){try{a[Nm.KHR_BINARY_GLTF]=new th(e)}catch(e){r&&r(e);return}i=JSON.parse(a[Nm.KHR_BINARY_GLTF].content)}else i=JSON.parse(s.decode(e))}else i=e;if(i.asset===void 0||i.asset.version[0]<2){r&&r(Error(`THREE.GLTFLoader: Unsupported asset. glTF versions >=2.0 are supported.`));return}let c=new Dh(i,{path:t||this.resourcePath||``,crossOrigin:this.crossOrigin,requestHeader:this.requestHeader,manager:this.manager,ktx2Loader:this.ktx2Loader,meshoptDecoder:this.meshoptDecoder});c.fileLoader.setRequestHeader(this.requestHeader);for(let e=0;e<this.pluginCallbacks.length;e++){let t=this.pluginCallbacks[e](c);t.name||console.error(`THREE.GLTFLoader: Invalid plugin found: missing name`),o[t.name]=t,a[t.name]=!0}if(i.extensionsUsed)for(let e=0;e<i.extensionsUsed.length;++e){let t=i.extensionsUsed[e],n=i.extensionsRequired||[];switch(t){case Nm.KHR_MATERIALS_UNLIT:a[t]=new Fm;break;case Nm.KHR_DRACO_MESH_COMPRESSION:a[t]=new nh(i,this.dracoLoader);break;case Nm.KHR_TEXTURE_TRANSFORM:a[t]=new rh;break;case Nm.KHR_MESH_QUANTIZATION:a[t]=new ih;break;default:n.indexOf(t)>=0&&o[t]===void 0&&console.warn(`THREE.GLTFLoader: Unknown extension "`+t+`".`)}}c.setExtensions(a),c.setPlugins(o),c.parse(n,r)}parseAsync(e,t){let n=this;return new Promise(function(r,i){n.parse(e,t,r,i)})}};function jm(){let e={};return{get:function(t){return e[t]},add:function(t,n){e[t]=n},remove:function(t){delete e[t]},removeAll:function(){e={}}}}function Mm(e,t,n){let r=e.json.materials[t];return r.extensions&&r.extensions[n]?r.extensions[n]:null}var Nm={KHR_BINARY_GLTF:`KHR_binary_glTF`,KHR_DRACO_MESH_COMPRESSION:`KHR_draco_mesh_compression`,KHR_LIGHTS_PUNCTUAL:`KHR_lights_punctual`,KHR_MATERIALS_CLEARCOAT:`KHR_materials_clearcoat`,KHR_MATERIALS_DISPERSION:`KHR_materials_dispersion`,KHR_MATERIALS_IOR:`KHR_materials_ior`,KHR_MATERIALS_SHEEN:`KHR_materials_sheen`,KHR_MATERIALS_SPECULAR:`KHR_materials_specular`,KHR_MATERIALS_TRANSMISSION:`KHR_materials_transmission`,KHR_MATERIALS_IRIDESCENCE:`KHR_materials_iridescence`,KHR_MATERIALS_ANISOTROPY:`KHR_materials_anisotropy`,KHR_MATERIALS_UNLIT:`KHR_materials_unlit`,KHR_MATERIALS_VOLUME:`KHR_materials_volume`,KHR_TEXTURE_BASISU:`KHR_texture_basisu`,KHR_TEXTURE_TRANSFORM:`KHR_texture_transform`,KHR_MESH_QUANTIZATION:`KHR_mesh_quantization`,KHR_MATERIALS_EMISSIVE_STRENGTH:`KHR_materials_emissive_strength`,EXT_MATERIALS_BUMP:`EXT_materials_bump`,EXT_TEXTURE_WEBP:`EXT_texture_webp`,EXT_TEXTURE_AVIF:`EXT_texture_avif`,EXT_MESHOPT_COMPRESSION:`EXT_meshopt_compression`,KHR_MESHOPT_COMPRESSION:`KHR_meshopt_compression`,EXT_MESH_GPU_INSTANCING:`EXT_mesh_gpu_instancing`},Pm=class{constructor(e){this.parser=e,this.name=Nm.KHR_LIGHTS_PUNCTUAL,this.cache={refs:{},uses:{}}}_markDefs(){let e=this.parser,t=this.parser.json.nodes||[];for(let n=0,r=t.length;n<r;n++){let r=t[n];r.extensions&&r.extensions[this.name]&&r.extensions[this.name].light!==void 0&&e._addNodeRef(this.cache,r.extensions[this.name].light)}}_loadLight(e){let t=this.parser,n=`light:`+e,r=t.cache.get(n);if(r)return r;let i=t.json,a=((i.extensions&&i.extensions[this.name]||{}).lights||[])[e],o,s=new U(16777215);a.color!==void 0&&s.setRGB(a.color[0],a.color[1],a.color[2],te);let c=a.range===void 0?0:a.range;switch(a.type){case`directional`:o=new _s(s),o.target.position.set(0,0,-1),o.add(o.target);break;case`point`:o=new ms(s),o.distance=c;break;case`spot`:o=new fs(s),o.distance=c,a.spot=a.spot||{},a.spot.innerConeAngle=a.spot.innerConeAngle===void 0?0:a.spot.innerConeAngle,a.spot.outerConeAngle=a.spot.outerConeAngle===void 0?Math.PI/4:a.spot.outerConeAngle,o.angle=a.spot.outerConeAngle,o.penumbra=1-a.spot.innerConeAngle/a.spot.outerConeAngle,o.target.position.set(0,0,-1),o.add(o.target);break;default:throw Error(`THREE.GLTFLoader: Unexpected light type: `+a.type)}return o.position.set(0,0,0),yh(o,a),a.intensity!==void 0&&(o.intensity=a.intensity),o.name=t.createUniqueName(a.name||`light_`+e),r=Promise.resolve(o),t.cache.add(n,r),r}getDependency(e,t){if(e===`light`)return this._loadLight(t)}createNodeAttachment(e){let t=this,n=this.parser,r=n.json.nodes[e],i=(r.extensions&&r.extensions[this.name]||{}).light;return i===void 0?null:this._loadLight(i).then(function(e){return n._getNodeRef(t.cache,i,e)})}},Fm=class{constructor(){this.name=Nm.KHR_MATERIALS_UNLIT}getMaterialType(){return rr}extendParams(e,t,n){let r=[];e.color=new U(1,1,1),e.opacity=1;let i=t.pbrMetallicRoughness;if(i){if(Array.isArray(i.baseColorFactor)){let t=i.baseColorFactor;e.color.setRGB(t[0],t[1],t[2],te),e.opacity=t[3]}i.baseColorTexture!==void 0&&r.push(n.assignTexture(e,`map`,i.baseColorTexture,N))}return Promise.all(r)}},Im=class{constructor(e){this.parser=e,this.name=Nm.KHR_MATERIALS_EMISSIVE_STRENGTH}extendMaterialParams(e,t){let n=Mm(this.parser,e,this.name);return n===null||n.emissiveStrength!==void 0&&(t.emissiveIntensity=n.emissiveStrength),Promise.resolve()}},Lm=class{constructor(e){this.parser=e,this.name=Nm.KHR_MATERIALS_CLEARCOAT}getMaterialType(e){return Mm(this.parser,e,this.name)===null?null:lo}extendMaterialParams(e,t){let n=Mm(this.parser,e,this.name);if(n===null)return Promise.resolve();let r=[];if(n.clearcoatFactor!==void 0&&(t.clearcoat=n.clearcoatFactor),n.clearcoatTexture!==void 0&&r.push(this.parser.assignTexture(t,`clearcoatMap`,n.clearcoatTexture)),n.clearcoatRoughnessFactor!==void 0&&(t.clearcoatRoughness=n.clearcoatRoughnessFactor),n.clearcoatRoughnessTexture!==void 0&&r.push(this.parser.assignTexture(t,`clearcoatRoughnessMap`,n.clearcoatRoughnessTexture)),n.clearcoatNormalTexture!==void 0&&(r.push(this.parser.assignTexture(t,`clearcoatNormalMap`,n.clearcoatNormalTexture)),n.clearcoatNormalTexture.scale!==void 0)){let e=n.clearcoatNormalTexture.scale;t.clearcoatNormalScale=new z(e,e)}return Promise.all(r)}},Rm=class{constructor(e){this.parser=e,this.name=Nm.KHR_MATERIALS_DISPERSION}getMaterialType(e){return Mm(this.parser,e,this.name)===null?null:lo}extendMaterialParams(e,t){let n=Mm(this.parser,e,this.name);return n===null||(t.dispersion=n.dispersion===void 0?0:n.dispersion),Promise.resolve()}},zm=class{constructor(e){this.parser=e,this.name=Nm.KHR_MATERIALS_IRIDESCENCE}getMaterialType(e){return Mm(this.parser,e,this.name)===null?null:lo}extendMaterialParams(e,t){let n=Mm(this.parser,e,this.name);if(n===null)return Promise.resolve();let r=[];return n.iridescenceFactor!==void 0&&(t.iridescence=n.iridescenceFactor),n.iridescenceTexture!==void 0&&r.push(this.parser.assignTexture(t,`iridescenceMap`,n.iridescenceTexture)),n.iridescenceIor!==void 0&&(t.iridescenceIOR=n.iridescenceIor),t.iridescenceThicknessRange===void 0&&(t.iridescenceThicknessRange=[100,400]),n.iridescenceThicknessMinimum!==void 0&&(t.iridescenceThicknessRange[0]=n.iridescenceThicknessMinimum),n.iridescenceThicknessMaximum!==void 0&&(t.iridescenceThicknessRange[1]=n.iridescenceThicknessMaximum),n.iridescenceThicknessTexture!==void 0&&r.push(this.parser.assignTexture(t,`iridescenceThicknessMap`,n.iridescenceThicknessTexture)),Promise.all(r)}},Bm=class{constructor(e){this.parser=e,this.name=Nm.KHR_MATERIALS_SHEEN}getMaterialType(e){return Mm(this.parser,e,this.name)===null?null:lo}extendMaterialParams(e,t){let n=Mm(this.parser,e,this.name);if(n===null)return Promise.resolve();let r=[];if(t.sheenColor=new U(0,0,0),t.sheenRoughness=0,t.sheen=1,n.sheenColorFactor!==void 0){let e=n.sheenColorFactor;t.sheenColor.setRGB(e[0],e[1],e[2],te)}return n.sheenRoughnessFactor!==void 0&&(t.sheenRoughness=n.sheenRoughnessFactor),n.sheenColorTexture!==void 0&&r.push(this.parser.assignTexture(t,`sheenColorMap`,n.sheenColorTexture,N)),n.sheenRoughnessTexture!==void 0&&r.push(this.parser.assignTexture(t,`sheenRoughnessMap`,n.sheenRoughnessTexture)),Promise.all(r)}},Vm=class{constructor(e){this.parser=e,this.name=Nm.KHR_MATERIALS_TRANSMISSION}getMaterialType(e){return Mm(this.parser,e,this.name)===null?null:lo}extendMaterialParams(e,t){let n=Mm(this.parser,e,this.name);if(n===null)return Promise.resolve();let r=[];return n.transmissionFactor!==void 0&&(t.transmission=n.transmissionFactor),n.transmissionTexture!==void 0&&r.push(this.parser.assignTexture(t,`transmissionMap`,n.transmissionTexture)),Promise.all(r)}},Hm=class{constructor(e){this.parser=e,this.name=Nm.KHR_MATERIALS_VOLUME}getMaterialType(e){return Mm(this.parser,e,this.name)===null?null:lo}extendMaterialParams(e,t){let n=Mm(this.parser,e,this.name);if(n===null)return Promise.resolve();let r=[];t.thickness=n.thicknessFactor===void 0?0:n.thicknessFactor,n.thicknessTexture!==void 0&&r.push(this.parser.assignTexture(t,`thicknessMap`,n.thicknessTexture)),t.attenuationDistance=n.attenuationDistance||1/0;let i=n.attenuationColor||[1,1,1];return t.attenuationColor=new U().setRGB(i[0],i[1],i[2],te),Promise.all(r)}},Um=class{constructor(e){this.parser=e,this.name=Nm.KHR_MATERIALS_IOR}getMaterialType(e){return Mm(this.parser,e,this.name)===null?null:lo}extendMaterialParams(e,t){let n=Mm(this.parser,e,this.name);return n===null?Promise.resolve():(t.ior=n.ior===void 0?1.5:n.ior,t.ior===0&&(t.ior=1e3),Promise.resolve())}},Wm=class{constructor(e){this.parser=e,this.name=Nm.KHR_MATERIALS_SPECULAR}getMaterialType(e){return Mm(this.parser,e,this.name)===null?null:lo}extendMaterialParams(e,t){let n=Mm(this.parser,e,this.name);if(n===null)return Promise.resolve();let r=[];t.specularIntensity=n.specularFactor===void 0?1:n.specularFactor,n.specularTexture!==void 0&&r.push(this.parser.assignTexture(t,`specularIntensityMap`,n.specularTexture));let i=n.specularColorFactor||[1,1,1];return t.specularColor=new U().setRGB(i[0],i[1],i[2],te),n.specularColorTexture!==void 0&&r.push(this.parser.assignTexture(t,`specularColorMap`,n.specularColorTexture,N)),Promise.all(r)}},Gm=class{constructor(e){this.parser=e,this.name=Nm.EXT_MATERIALS_BUMP}getMaterialType(e){return Mm(this.parser,e,this.name)===null?null:lo}extendMaterialParams(e,t){let n=Mm(this.parser,e,this.name);if(n===null)return Promise.resolve();let r=[];return t.bumpScale=n.bumpFactor===void 0?1:n.bumpFactor,n.bumpTexture!==void 0&&r.push(this.parser.assignTexture(t,`bumpMap`,n.bumpTexture)),Promise.all(r)}},Km=class{constructor(e){this.parser=e,this.name=Nm.KHR_MATERIALS_ANISOTROPY}getMaterialType(e){return Mm(this.parser,e,this.name)===null?null:lo}extendMaterialParams(e,t){let n=Mm(this.parser,e,this.name);if(n===null)return Promise.resolve();let r=[];return n.anisotropyStrength!==void 0&&(t.anisotropy=n.anisotropyStrength),n.anisotropyRotation!==void 0&&(t.anisotropyRotation=n.anisotropyRotation),n.anisotropyTexture!==void 0&&r.push(this.parser.assignTexture(t,`anisotropyMap`,n.anisotropyTexture)),Promise.all(r)}},qm=class{constructor(e){this.parser=e,this.name=Nm.KHR_TEXTURE_BASISU}loadTexture(e){let t=this.parser,n=t.json,r=n.textures[e];if(!r.extensions||!r.extensions[this.name])return null;let i=r.extensions[this.name],a=t.options.ktx2Loader;if(!a){if(n.extensionsRequired&&n.extensionsRequired.indexOf(this.name)>=0)throw Error(`THREE.GLTFLoader: setKTX2Loader must be called before loading KTX2 textures`);return null}return t.loadTextureImage(e,i.source,a)}},Jm=class{constructor(e){this.parser=e,this.name=Nm.EXT_TEXTURE_WEBP}loadTexture(e){let t=this.name,n=this.parser,r=n.json,i=r.textures[e];if(!i.extensions||!i.extensions[t])return null;let a=i.extensions[t],o=r.images[a.source],s=n.textureLoader;if(o.uri){let e=n.options.manager.getHandler(o.uri);e!==null&&(s=e)}return n.loadTextureImage(e,a.source,s)}},Ym=class{constructor(e){this.parser=e,this.name=Nm.EXT_TEXTURE_AVIF}loadTexture(e){let t=this.name,n=this.parser,r=n.json,i=r.textures[e];if(!i.extensions||!i.extensions[t])return null;let a=i.extensions[t],o=r.images[a.source],s=n.textureLoader;if(o.uri){let e=n.options.manager.getHandler(o.uri);e!==null&&(s=e)}return n.loadTextureImage(e,a.source,s)}},Xm=class{constructor(e,t){this.name=t,this.parser=e}loadBufferView(e){let t=this.parser.json,n=t.bufferViews[e];if(n.extensions&&n.extensions[this.name]){let e=n.extensions[this.name],r=this.parser.getDependency(`buffer`,e.buffer),i=this.parser.options.meshoptDecoder;if(!i||!i.supported){if(t.extensionsRequired&&t.extensionsRequired.indexOf(this.name)>=0)throw Error(`THREE.GLTFLoader: setMeshoptDecoder must be called before loading compressed files`);return null}return r.then(function(t){let n=e.byteOffset||0,r=e.byteLength||0,a=e.count,o=e.byteStride,s=new Uint8Array(t,n,r);return i.decodeGltfBufferAsync?i.decodeGltfBufferAsync(a,o,s,e.mode,e.filter).then(function(e){return e.buffer}):i.ready.then(function(){let t=new ArrayBuffer(a*o);return i.decodeGltfBuffer(new Uint8Array(t),a,o,s,e.mode,e.filter),t})})}return null}},Zm=class{constructor(e){this.name=Nm.EXT_MESH_GPU_INSTANCING,this.parser=e}createNodeMesh(e){let t=this.parser.json,n=t.nodes[e];if(!n.extensions||!n.extensions[this.name]||n.mesh===void 0)return null;let r=t.meshes[n.mesh];for(let e of r.primitives)if(e.mode!==ch.TRIANGLES&&e.mode!==ch.TRIANGLE_STRIP&&e.mode!==ch.TRIANGLE_FAN&&e.mode!==void 0)return null;let i=n.extensions[this.name].attributes,a=[],o={};for(let e in i)a.push(this.parser.getDependency(`accessor`,i[e]).then(t=>(o[e]=t,o[e])));return a.length<1?null:(a.push(this.parser.createNodeMesh(e)),Promise.all(a).then(e=>{let t=e.pop(),n=t.isGroup?t.children:[t],r=e[0].count,i=[];for(let e of n){let t=new ft,n=new V,a=new B,s=new V(1,1,1),c=new Br(e.geometry,e.material,r);for(let e=0;e<r;e++)o.TRANSLATION&&n.fromBufferAttribute(o.TRANSLATION,e),o.ROTATION&&a.fromBufferAttribute(o.ROTATION,e),o.SCALE&&s.fromBufferAttribute(o.SCALE,e),c.setMatrixAt(e,t.compose(n,a,s));let l=null;for(let e in o)if(e===`_COLOR_0`){let t=o[e];c.instanceColor=new Mr(t.array,t.itemSize,t.normalized)}else if(e!==`TRANSLATION`&&e!==`ROTATION`&&e!==`SCALE`){if(l===null){let e=c.geometry;l=new Hn,l.name=e.name;for(let t in e.attributes)l.setAttribute(t,e.attributes[t]);for(let t in e.morphAttributes)l.morphAttributes[t]=e.morphAttributes[t];e.index!==null&&l.setIndex(e.index),l.morphTargetsRelative=e.morphTargetsRelative;for(let t of e.groups)l.addGroup(t.start,t.count,t.materialIndex);e.boundingBox!==null&&(l.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(l.boundingSphere=e.boundingSphere.clone()),l.drawRange.start=e.drawRange.start,l.drawRange.count=e.drawRange.count,l.userData=Object.assign({},e.userData),c.geometry=l}let t=o[e];l.setAttribute(e,new Mr(t.array,t.itemSize,t.normalized))}zt.prototype.copy.call(c,e),this.parser.assignFinalMaterial(c),i.push(c)}return t.isGroup?(t.clear(),t.add(...i),t):i[0]}))}},Qm=`glTF`,$m=12,eh={JSON:1313821514,BIN:5130562},th=class{constructor(e){this.name=Nm.KHR_BINARY_GLTF,this.content=null,this.body=null;let t=new DataView(e,0,$m),n=new TextDecoder;if(this.header={magic:n.decode(new Uint8Array(e.slice(0,4))),version:t.getUint32(4,!0),length:t.getUint32(8,!0)},this.header.magic!==Qm)throw Error(`THREE.GLTFLoader: Unsupported glTF-Binary header.`);if(this.header.version<2)throw Error(`THREE.GLTFLoader: Legacy binary file detected.`);let r=this.header.length-$m,i=new DataView(e,$m),a=0;for(;a<r;){let t=i.getUint32(a,!0);a+=4;let r=i.getUint32(a,!0);if(a+=4,r===eh.JSON){let r=new Uint8Array(e,$m+a,t);this.content=n.decode(r)}else if(r===eh.BIN){let n=$m+a;this.body=e.slice(n,n+t)}a+=t}if(this.content===null)throw Error(`THREE.GLTFLoader: JSON content not found.`)}},nh=class{constructor(e,t){if(!t)throw Error(`THREE.GLTFLoader: No DRACOLoader instance provided.`);this.name=Nm.KHR_DRACO_MESH_COMPRESSION,this.json=e,this.dracoLoader=t,this.dracoLoader.preload()}decodePrimitive(e,t){let n=this.json,r=this.dracoLoader,i=e.extensions[this.name].bufferView,a=e.extensions[this.name].attributes,o={},s={},c={};for(let e in a){let t=ph[e]||e.toLowerCase();o[t]=a[e]}for(let t in e.attributes){let r=ph[t]||t.toLowerCase();if(a[t]!==void 0){let i=n.accessors[e.attributes[t]];c[r]=lh[i.componentType].name,s[r]=i.normalized===!0}}return t.getDependency(`bufferView`,i).then(function(e){return new Promise(function(t,n){r.decodeDracoFile(e,function(e){for(let t in e.attributes){let n=e.attributes[t],r=s[t];r!==void 0&&(n.normalized=r)}t(e)},o,c,te,n)})})}},rh=class{constructor(){this.name=Nm.KHR_TEXTURE_TRANSFORM}extendTexture(e,t){if((t.texCoord===void 0||t.texCoord===e.channel)&&t.offset===void 0&&t.rotation===void 0&&t.scale===void 0)return e;if(e=e.clone(),t.texCoord!==void 0&&(e.channel=t.texCoord),t.offset!==void 0&&e.offset.fromArray(t.offset),t.rotation!==void 0&&(e.rotation=t.rotation),t.scale!==void 0&&e.repeat.fromArray(t.scale),t.rotation!==void 0){let t=Math.cos(e.rotation),n=Math.sin(e.rotation);e.matrix.set(e.repeat.x*t,e.repeat.y*n,e.offset.x,-e.repeat.x*n,e.repeat.y*t,e.offset.y,0,0,1),e.matrixAutoUpdate=!1}return e.needsUpdate=!0,e}},ih=class{constructor(){this.name=Nm.KHR_MESH_QUANTIZATION}},ah=class extends xo{constructor(e,t,n,r){super(e,t,n,r)}copySampleValue_(e){let t=this.resultBuffer,n=this.sampleValues,r=this.valueSize,i=e*r*3+r;for(let e=0;e!==r;e++)t[e]=n[i+e];return t}interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=o*2,c=o*3,l=r-t,u=(n-t)/l,d=u*u,f=d*u,p=e*c,m=p-c,h=-2*f+3*d,g=f-d,_=1-h,v=g-d+u;for(let e=0;e!==o;e++){let t=a[m+e+o],n=a[m+e+s]*l,r=a[p+e+o],c=a[p+e]*l;i[e]=_*t+v*n+h*r+g*c}return i}},oh=new B,sh=class extends ah{interpolate_(e,t,n,r){let i=super.interpolate_(e,t,n,r);return oh.fromArray(i).normalize().toArray(i),i}},ch={FLOAT:5126,FLOAT_MAT3:35675,FLOAT_MAT4:35676,FLOAT_VEC2:35664,FLOAT_VEC3:35665,FLOAT_VEC4:35666,LINEAR:9729,REPEAT:10497,SAMPLER_2D:35678,POINTS:0,LINES:1,LINE_LOOP:2,LINE_STRIP:3,TRIANGLES:4,TRIANGLE_STRIP:5,TRIANGLE_FAN:6,UNSIGNED_BYTE:5121,UNSIGNED_SHORT:5123},lh={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array},uh={9728:r,9729:o,9984:i,9985:s,9986:a,9987:c},dh={33071:t,33648:n,10497:e},fh={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16},ph={POSITION:`position`,NORMAL:`normal`,TANGENT:`tangent`,TEXCOORD_0:`uv`,TEXCOORD_1:`uv1`,TEXCOORD_2:`uv2`,TEXCOORD_3:`uv3`,COLOR_0:`color`,WEIGHTS_0:`skinWeight`,JOINTS_0:`skinIndex`},mh={scale:`scale`,translation:`position`,rotation:`quaternion`,weights:`morphTargetInfluences`},hh={CUBICSPLINE:void 0,LINEAR:E,STEP:T},gh={OPAQUE:`OPAQUE`,MASK:`MASK`,BLEND:`BLEND`};function _h(e){return e.DefaultMaterial===void 0&&(e.DefaultMaterial=new co({color:16777215,emissive:0,metalness:1,roughness:1,transparent:!1,depthTest:!0,side:0})),e.DefaultMaterial}function vh(e,t,n){for(let r in n.extensions)e[r]===void 0&&(t.userData.gltfExtensions=t.userData.gltfExtensions||{},t.userData.gltfExtensions[r]=n.extensions[r])}function yh(e,t){t.extras!==void 0&&(typeof t.extras==`object`?Object.assign(e.userData,t.extras):console.warn(`THREE.GLTFLoader: Ignoring primitive type .extras, `+t.extras))}function bh(e,t,n){let r=!1,i=!1,a=!1;for(let e=0,n=t.length;e<n;e++){let n=t[e];if(n.POSITION!==void 0&&(r=!0),n.NORMAL!==void 0&&(i=!0),n.COLOR_0!==void 0&&(a=!0),r&&i&&a)break}if(!r&&!i&&!a)return Promise.resolve(e);let o=[],s=[],c=[];for(let l=0,u=t.length;l<u;l++){let u=t[l];if(r){let t=u.POSITION===void 0?e.attributes.position:n.getDependency(`accessor`,u.POSITION);o.push(t)}if(i){let t=u.NORMAL===void 0?e.attributes.normal:n.getDependency(`accessor`,u.NORMAL);s.push(t)}if(a){let t=u.COLOR_0===void 0?e.attributes.color:n.getDependency(`accessor`,u.COLOR_0);c.push(t)}}return Promise.all([Promise.all(o),Promise.all(s),Promise.all(c)]).then(function(t){let n=t[0],o=t[1],s=t[2];return r&&(e.morphAttributes.position=n),i&&(e.morphAttributes.normal=o),a&&(e.morphAttributes.color=s),e.morphTargetsRelative=!0,e})}function xh(e,t){if(e.updateMorphTargets(),t.weights!==void 0)for(let n=0,r=t.weights.length;n<r;n++)e.morphTargetInfluences[n]=t.weights[n];if(t.extras&&Array.isArray(t.extras.targetNames)){let n=t.extras.targetNames;if(e.morphTargetInfluences.length===n.length){e.morphTargetDictionary={};for(let t=0,r=n.length;t<r;t++)e.morphTargetDictionary[n[t]]=t}else console.warn(`THREE.GLTFLoader: Invalid extras.targetNames length. Ignoring names.`)}}function Sh(e){let t,n=e.extensions&&e.extensions[Nm.KHR_DRACO_MESH_COMPRESSION];if(t=n?`draco:`+n.bufferView+`:`+n.indices+`:`+Ch(n.attributes):e.indices+`:`+Ch(e.attributes)+`:`+e.mode,e.targets!==void 0)for(let n=0,r=e.targets.length;n<r;n++)t+=`:`+Ch(e.targets[n]);return t}function Ch(e){let t=``,n=Object.keys(e).sort();for(let r=0,i=n.length;r<i;r++)t+=n[r]+`:`+e[n[r]]+`;`;return t}function wh(e){switch(e){case Int8Array:return 1/127;case Uint8Array:return 1/255;case Int16Array:return 1/32767;case Uint16Array:return 1/65535;default:throw Error(`THREE.GLTFLoader: Unsupported normalized accessor component type.`)}}function Th(e){return e.search(/\.jpe?g($|\?)/i)>0||e.search(/^data\:image\/jpeg/)===0?`image/jpeg`:e.search(/\.webp($|\?)/i)>0||e.search(/^data\:image\/webp/)===0?`image/webp`:e.search(/\.ktx2($|\?)/i)>0||e.search(/^data\:image\/ktx2/)===0?`image/ktx2`:`image/png`}var Eh=new ft,Dh=class{constructor(e={},t={}){this.json=e,this.extensions={},this.plugins={},this.options=t,this.cache=new jm,this.associations=new Map,this.primitiveCache={},this.nodeCache={},this.meshCache={refs:{},uses:{}},this.cameraCache={refs:{},uses:{}},this.lightCache={refs:{},uses:{}},this.sourceCache={},this.textureCache={},this.nodeNamesUsed={};let n=!1,r=-1,i=!1,a=-1;if(typeof navigator<`u`&&navigator.userAgent!==void 0){let e=navigator.userAgent;n=/^((?!chrome|android).)*safari/i.test(e)===!0;let t=e.match(/Version\/(\d+)/);r=n&&t?parseInt(t[1],10):-1,i=e.indexOf(`Firefox`)>-1,a=i?e.match(/Firefox\/([0-9]+)\./)[1]:-1}this.textureLoader=typeof createImageBitmap>`u`||n&&r<17||i&&a<98?new Xo(this.options.manager):new xs(this.options.manager),this.textureLoader.setCrossOrigin(this.options.crossOrigin),this.textureLoader.setRequestHeader(this.options.requestHeader),this.fileLoader=new qo(this.options.manager),this.fileLoader.setResponseType(`arraybuffer`),this.options.crossOrigin===`use-credentials`&&this.fileLoader.setWithCredentials(!0)}setExtensions(e){this.extensions=e}setPlugins(e){this.plugins=e}parse(e,t){let n=this,r=this.json,i=this.extensions;this.cache.removeAll(),this.nodeCache={},this._invokeAll(function(e){return e._markDefs&&e._markDefs()}),Promise.all(this._invokeAll(function(e){return e.beforeRoot&&e.beforeRoot()})).then(function(){return Promise.all([n.getDependencies(`scene`),n.getDependencies(`animation`),n.getDependencies(`camera`)])}).then(function(t){let a={scene:t[0][r.scene||0],scenes:t[0],animations:t[1],cameras:t[2],asset:r.asset,parser:n,userData:{}};return vh(i,a,r),yh(a,r),Promise.all(n._invokeAll(function(e){return e.afterRoot&&e.afterRoot(a)})).then(function(){for(let e of a.scenes)e.updateMatrixWorld();e(a)})}).catch(t)}_markDefs(){let e=this.json.nodes||[],t=this.json.skins||[],n=this.json.meshes||[];for(let n=0,r=t.length;n<r;n++){let r=t[n].joints;for(let t=0,n=r.length;t<n;t++)e[r[t]].isBone=!0}for(let t=0,r=e.length;t<r;t++){let r=e[t];r.mesh!==void 0&&(this._addNodeRef(this.meshCache,r.mesh),r.skin!==void 0&&(n[r.mesh].isSkinnedMesh=!0)),r.camera!==void 0&&this._addNodeRef(this.cameraCache,r.camera)}}_addNodeRef(e,t){t!==void 0&&(e.refs[t]===void 0&&(e.refs[t]=e.uses[t]=0),e.refs[t]++)}_getNodeRef(e,t,n){if(e.refs[t]<=1)return n;let r=n.clone(),i=(e,t)=>{let n=this.associations.get(e);n!=null&&this.associations.set(t,n);for(let[n,r]of e.children.entries())i(r,t.children[n])};return i(n,r),r.name+=`_instance_`+e.uses[t]++,r}_invokeOne(e){let t=Object.values(this.plugins);t.push(this);for(let n=0;n<t.length;n++){let r=e(t[n]);if(r)return r}return null}_invokeAll(e){let t=Object.values(this.plugins);t.unshift(this);let n=[];for(let r=0;r<t.length;r++){let i=e(t[r]);i&&n.push(i)}return n}getDependency(e,t){let n=e+`:`+t,r=this.cache.get(n);if(!r){switch(e){case`scene`:r=this.loadScene(t);break;case`node`:r=this._invokeOne(function(e){return e.loadNode&&e.loadNode(t)});break;case`mesh`:r=this._invokeOne(function(e){return e.loadMesh&&e.loadMesh(t)});break;case`accessor`:r=this.loadAccessor(t);break;case`bufferView`:r=this._invokeOne(function(e){return e.loadBufferView&&e.loadBufferView(t)});break;case`buffer`:r=this.loadBuffer(t);break;case`material`:r=this._invokeOne(function(e){return e.loadMaterial&&e.loadMaterial(t)});break;case`texture`:r=this._invokeOne(function(e){return e.loadTexture&&e.loadTexture(t)});break;case`skin`:r=this.loadSkin(t);break;case`animation`:r=this._invokeOne(function(e){return e.loadAnimation&&e.loadAnimation(t)});break;case`camera`:r=this.loadCamera(t);break;default:if(r=this._invokeOne(function(n){return n!=this&&n.getDependency&&n.getDependency(e,t)}),!r)throw Error(`Unknown type: `+e)}this.cache.add(n,r)}return r}getDependencies(e){let t=this.cache.get(e);if(!t){let n=this,r=this.json[e+(e===`mesh`?`es`:`s`)]||[];t=Promise.all(r.map(function(t,r){return n.getDependency(e,r)})),this.cache.add(e,t)}return t}loadBuffer(e){let t=this.json.buffers[e],n=this.fileLoader;if(t.type&&t.type!==`arraybuffer`)throw Error(`THREE.GLTFLoader: `+t.type+` buffer type is not supported.`);if(t.uri===void 0&&e===0)return Promise.resolve(this.extensions[Nm.KHR_BINARY_GLTF].body);let r=this.options;return new Promise(function(e,i){n.load(vs.resolveURL(t.uri,r.path),e,void 0,function(){i(Error(`THREE.GLTFLoader: Failed to load buffer "`+t.uri+`".`))})})}loadBufferView(e){let t=this.json.bufferViews[e];return this.getDependency(`buffer`,t.buffer).then(function(e){let n=t.byteLength||0,r=t.byteOffset||0;return e.slice(r,r+n)})}loadAccessor(e){let t=this,n=this.json,r=this.json.accessors[e];if(r.bufferView===void 0&&r.sparse===void 0){let e=fh[r.type],t=lh[r.componentType],n=r.normalized===!0,i=new t(r.count*e);return Promise.resolve(new On(i,e,n))}let i=[];return r.bufferView===void 0?i.push(null):i.push(this.getDependency(`bufferView`,r.bufferView)),r.sparse!==void 0&&(i.push(this.getDependency(`bufferView`,r.sparse.indices.bufferView)),i.push(this.getDependency(`bufferView`,r.sparse.values.bufferView))),Promise.all(i).then(function(e){let i=e[0],a=fh[r.type],o=lh[r.componentType],s=o.BYTES_PER_ELEMENT,c=s*a,l=r.byteOffset||0,u=r.bufferView===void 0?void 0:n.bufferViews[r.bufferView].byteStride,d=r.normalized===!0,f,p;if(u&&u!==c){let e=Math.floor(l/u),n=`InterleavedBuffer:`+r.bufferView+`:`+r.componentType+`:`+e+`:`+r.count,c=t.cache.get(n);c||(f=new o(i,e*u,r.count*u/s),c=new Un(f,u/s),t.cache.add(n,c)),p=new Gn(c,a,l%u/s,d)}else f=i===null?new o(r.count*a):new o(i,l,r.count*a),p=new On(f,a,d);if(r.sparse!==void 0){let t=fh.SCALAR,n=lh[r.sparse.indices.componentType],s=r.sparse.indices.byteOffset||0,c=r.sparse.values.byteOffset||0,l=new n(e[1],s,r.sparse.count*t),u=new o(e[2],c,r.sparse.count*a);i!==null&&(p=new On(p.array.slice(),p.itemSize,p.normalized)),p.normalized=!1;for(let e=0,t=l.length;e<t;e++){let t=l[e];if(p.setX(t,u[e*a]),a>=2&&p.setY(t,u[e*a+1]),a>=3&&p.setZ(t,u[e*a+2]),a>=4&&p.setW(t,u[e*a+3]),a>=5)throw Error(`THREE.GLTFLoader: Unsupported itemSize in sparse BufferAttribute.`)}p.normalized=d}return p})}loadTexture(e){let t=this.json,n=this.options,r=t.textures[e].source,i=t.images[r],a=this.textureLoader;if(i.uri){let e=n.manager.getHandler(i.uri);e!==null&&(a=e)}return this.loadTextureImage(e,r,a)}loadTextureImage(e,t,n){let r=this,i=this.json,a=i.textures[e],o=i.images[t],s=(o.uri||o.bufferView)+`:`+a.sampler;if(this.textureCache[s])return this.textureCache[s];let c=this.loadImageSource(t,n).then(function(t){t.flipY=!1,t.name=a.name||o.name||``,t.name===``&&typeof o.uri==`string`&&o.uri.startsWith(`data:image/`)===!1&&(t.name=o.uri);let n=(i.samplers||{})[a.sampler]||{};return t.magFilter=uh[n.magFilter]||1006,t.minFilter=uh[n.minFilter]||1008,t.wrapS=dh[n.wrapS]||1e3,t.wrapT=dh[n.wrapT]||1e3,t.generateMipmaps=!t.isCompressedTexture&&t.minFilter!==1003&&t.minFilter!==1006,r.associations.set(t,{textures:e}),t}).catch(function(){return null});return this.textureCache[s]=c,c}loadImageSource(e,t){let n=this,r=this.json,i=this.options;if(this.sourceCache[e]!==void 0)return this.sourceCache[e].then(e=>e.clone());let a=r.images[e],o=self.URL||self.webkitURL,s=a.uri||``,c=!1;if(a.bufferView!==void 0)s=n.getDependency(`bufferView`,a.bufferView).then(function(e){c=!0;let t=new Blob([e],{type:a.mimeType});return s=o.createObjectURL(t),s});else if(a.uri===void 0)throw Error(`THREE.GLTFLoader: Image `+e+` is missing URI and bufferView`);let l=Promise.resolve(s).then(function(e){return new Promise(function(n,r){let a=n;t.isImageBitmapLoader===!0&&(a=function(e){let t=new ot(e);t.needsUpdate=!0,n(t)}),t.load(vs.resolveURL(e,i.path),a,void 0,r)})}).then(function(e){return c===!0&&o.revokeObjectURL(s),yh(e,a),e.userData.mimeType=a.mimeType||Th(a.uri),e}).catch(function(e){throw console.error(`THREE.GLTFLoader: Couldn't load texture`,s),e});return this.sourceCache[e]=l,l}assignTexture(e,t,n,r){let i=this;return this.getDependency(`texture`,n.index).then(function(a){if(!a)return null;if(n.texCoord!==void 0&&n.texCoord>0&&(a=a.clone(),a.channel=n.texCoord),i.extensions[Nm.KHR_TEXTURE_TRANSFORM]){let e=n.extensions===void 0?void 0:n.extensions[Nm.KHR_TEXTURE_TRANSFORM];if(e){let t=i.associations.get(a);a=i.extensions[Nm.KHR_TEXTURE_TRANSFORM].extendTexture(a,e),i.associations.set(a,t)}}return r!==void 0&&(a.colorSpace=r),e[t]=a,a})}assignFinalMaterial(e){let t=e.geometry,n=e.material,r=t.attributes.tangent===void 0,i=t.attributes.color!==void 0,a=t.attributes.normal===void 0;if(e.isPoints){let e=`PointsMaterial:`+n.uuid,t=this.cache.get(e);t||(t=new ai,Zn.prototype.copy.call(t,n),t.color.copy(n.color),t.map=n.map,t.sizeAttenuation=!1,this.cache.add(e,t)),n=t}else if(e.isLine){let e=`LineBasicMaterial:`+n.uuid,t=this.cache.get(e);t||(t=new Gr,Zn.prototype.copy.call(t,n),t.color.copy(n.color),t.map=n.map,this.cache.add(e,t)),n=t}if(r||i||a){let e=`ClonedMaterial:`+n.uuid+`:`;r&&(e+=`derivative-tangents:`),i&&(e+=`vertex-colors:`),a&&(e+=`flat-shading:`);let t=this.cache.get(e);t||(t=n.clone(),i&&(t.vertexColors=!0),a&&(t.flatShading=!0),r&&(t.normalScale&&(t.normalScale.y*=-1),t.clearcoatNormalScale&&(t.clearcoatNormalScale.y*=-1)),this.cache.add(e,t),this.associations.set(t,this.associations.get(n))),n=t}e.material=n}getMaterialType(){return co}loadMaterial(e){let t=this,n=this.json,r=this.extensions,i=n.materials[e],a,o={},s=i.extensions||{},c=[];if(s[Nm.KHR_MATERIALS_UNLIT]){let e=r[Nm.KHR_MATERIALS_UNLIT];a=e.getMaterialType(),c.push(e.extendParams(o,i,t))}else{let n=i.pbrMetallicRoughness||{};if(o.color=new U(1,1,1),o.opacity=1,Array.isArray(n.baseColorFactor)){let e=n.baseColorFactor;o.color.setRGB(e[0],e[1],e[2],te),o.opacity=e[3]}n.baseColorTexture!==void 0&&c.push(t.assignTexture(o,`map`,n.baseColorTexture,N)),o.metalness=n.metallicFactor===void 0?1:n.metallicFactor,o.roughness=n.roughnessFactor===void 0?1:n.roughnessFactor,n.metallicRoughnessTexture!==void 0&&(c.push(t.assignTexture(o,`metalnessMap`,n.metallicRoughnessTexture)),c.push(t.assignTexture(o,`roughnessMap`,n.metallicRoughnessTexture))),a=this._invokeOne(function(t){return t.getMaterialType&&t.getMaterialType(e)}),c.push(Promise.all(this._invokeAll(function(t){return t.extendMaterialParams&&t.extendMaterialParams(e,o)})))}i.doubleSided===!0&&(o.side=2);let l=i.alphaMode||gh.OPAQUE;if(l===gh.BLEND?(o.transparent=!0,o.depthWrite=!1):(o.transparent=!1,l===gh.MASK&&(o.alphaTest=i.alphaCutoff===void 0?.5:i.alphaCutoff)),i.normalTexture!==void 0&&a!==rr&&(c.push(t.assignTexture(o,`normalMap`,i.normalTexture)),o.normalScale=new z(1,1),i.normalTexture.scale!==void 0)){let e=i.normalTexture.scale;o.normalScale.set(e,e)}if(i.occlusionTexture!==void 0&&a!==rr&&(c.push(t.assignTexture(o,`aoMap`,i.occlusionTexture)),i.occlusionTexture.strength!==void 0&&(o.aoMapIntensity=i.occlusionTexture.strength)),i.emissiveFactor!==void 0&&a!==rr){let e=i.emissiveFactor;o.emissive=new U().setRGB(e[0],e[1],e[2],te)}return i.emissiveTexture!==void 0&&a!==rr&&c.push(t.assignTexture(o,`emissiveMap`,i.emissiveTexture,N)),Promise.all(c).then(function(){let n=new a(o);return i.name&&(n.name=i.name),yh(n,i),t.associations.set(n,{materials:e}),i.extensions&&vh(r,n,i),n})}createUniqueName(e){let t=Bs.sanitizeNodeName(e||``);return t in this.nodeNamesUsed?t+`_`+ ++this.nodeNamesUsed[t]:(this.nodeNamesUsed[t]=0,t)}loadGeometries(e){let t=this,n=this.extensions,r=this.primitiveCache;function i(e){return n[Nm.KHR_DRACO_MESH_COMPRESSION].decodePrimitive(e,t).then(function(n){return kh(n,e,t)})}let a=[];for(let n=0,o=e.length;n<o;n++){let o=e[n],s=Sh(o),c=r[s];if(c)a.push(c.promise);else{let e;e=o.extensions&&o.extensions[Nm.KHR_DRACO_MESH_COMPRESSION]?i(o):kh(new Hn,o,t),o.mode===ch.TRIANGLE_STRIP?e=e.then(e=>jf(e,1)):o.mode===ch.TRIANGLE_FAN&&(e=e.then(e=>jf(e,2))),r[s]={primitive:o,promise:e},a.push(e)}}return Promise.all(a)}loadMesh(e){let t=this,n=this.json,r=this.extensions,i=n.meshes[e],a=i.primitives,o=[];for(let e=0,t=a.length;e<t;e++){let t=a[e].material===void 0?_h(this.cache):this.getDependency(`material`,a[e].material);o.push(t)}return o.push(t.loadGeometries(a)),Promise.all(o).then(async function(n){let o=n.slice(0,n.length-1),s=n[n.length-1],c=[];for(let n=0,l=s.length;n<l;n++){let l=s[n],u=a[n],d,f=o[n];if(u.mode===ch.TRIANGLES||u.mode===ch.TRIANGLE_STRIP||u.mode===ch.TRIANGLE_FAN||u.mode===void 0){let e=i.isSkinnedMesh===!0,t=l.hasAttribute(`skinIndex`)&&l.hasAttribute(`skinWeight`);e&&t===!1&&console.warn(`THREE.GLTFLoader: Missing skinIndex or skinWeight attributes. Skinning disabled.`),d=e&&t?new Er(l,f):new G(l,f),d.isSkinnedMesh===!0&&d.normalizeSkinWeights()}else if(u.mode===ch.LINES)d=new ri(l,f);else if(u.mode===ch.LINE_STRIP)d=new $r(l,f);else if(u.mode===ch.LINE_LOOP)d=new ii(l,f);else if(u.mode===ch.POINTS)d=new ui(l,f);else throw Error(`THREE.GLTFLoader: Primitive mode unsupported: `+u.mode);Object.keys(d.geometry.morphAttributes).length>0&&xh(d,i),d.name=t.createUniqueName(i.name||`mesh_`+e),yh(d,i),u.extensions&&vh(r,d,u),t.assignFinalMaterial(d),c.push(d)}for(let n=0,r=c.length;n<r;n++)t.associations.set(c[n],{meshes:e,primitives:n});if(c.length===1)return i.extensions&&vh(r,c[0],i),c[0];let l=new H;i.extensions&&vh(r,l,i),t.associations.set(l,{meshes:e});for(let e=0,t=c.length;e<t;e++)l.add(c[e]);return l})}loadCamera(e){let t,n=this.json.cameras[e],r=n[n.type];if(!r){console.warn(`THREE.GLTFLoader: Missing camera parameters.`);return}return n.type===`perspective`?t=new us(He.radToDeg(r.yfov),r.aspectRatio||1,r.znear||1,r.zfar||2e6):n.type===`orthographic`&&(t=new hs(-r.xmag,r.xmag,r.ymag,-r.ymag,r.znear,r.zfar)),n.name&&(t.name=this.createUniqueName(n.name)),yh(t,n),Promise.resolve(t)}loadSkin(e){let t=this.json.skins[e],n=[];for(let e=0,r=t.joints.length;e<r;e++)n.push(this._loadNodeShallow(t.joints[e]));return t.inverseBindMatrices===void 0?n.push(null):n.push(this.getDependency(`accessor`,t.inverseBindMatrices)),Promise.all(n).then(function(e){let n=e.pop(),r=e,i=[],a=[];for(let e=0,o=r.length;e<o;e++){let o=r[e];if(o){i.push(o);let t=new ft;n!==null&&t.fromArray(n.array,e*16),a.push(t)}else console.warn(`THREE.GLTFLoader: Joint "%s" could not be found.`,t.joints[e])}return new jr(i,a)})}loadAnimation(e){let t=this.json,n=this,r=t.animations[e],i=r.name?r.name:`animation_`+e,a=[],o=[],s=[],c=[],l=[];for(let e=0,t=r.channels.length;e<t;e++){let t=r.channels[e],n=r.samplers[t.sampler],i=t.target,u=i.node,d=r.parameters===void 0?n.input:r.parameters[n.input],f=r.parameters===void 0?n.output:r.parameters[n.output];i.node!==void 0&&(a.push(this.getDependency(`node`,u)),o.push(this.getDependency(`accessor`,d)),s.push(this.getDependency(`accessor`,f)),c.push(n),l.push(i))}return Promise.all([Promise.all(a),Promise.all(o),Promise.all(s),Promise.all(c),Promise.all(l)]).then(function(e){let t=e[0],a=e[1],o=e[2],s=e[3],c=e[4],l=[];for(let e=0,r=t.length;e<r;e++){let r=t[e],i=a[e],u=o[e],d=s[e],f=c[e];if(r===void 0)continue;r.updateMatrix&&r.updateMatrix();let p=n._createAnimationTracks(r,i,u,d,f);if(p)for(let e=0;e<p.length;e++)l.push(p[e])}let u=new Ro(i,void 0,l);return yh(u,r),u})}createNodeMesh(e){let t=this.json,n=this,r=t.nodes[e];return r.mesh===void 0?null:n.getDependency(`mesh`,r.mesh).then(function(e){let t=n._getNodeRef(n.meshCache,r.mesh,e);return r.weights!==void 0&&t.traverse(function(e){if(e.isMesh)for(let t=0,n=r.weights.length;t<n;t++)e.morphTargetInfluences[t]=r.weights[t]}),t})}loadNode(e){let t=this.json,n=this,r=t.nodes[e],i=n._loadNodeShallow(e),a=[],o=r.children||[];for(let e=0,t=o.length;e<t;e++)a.push(n.getDependency(`node`,o[e]));let s=r.skin===void 0?Promise.resolve(null):n.getDependency(`skin`,r.skin);return Promise.all([i,Promise.all(a),s]).then(function(e){let t=e[0],n=e[1],r=e[2];r!==null&&t.traverse(function(e){e.isSkinnedMesh&&e.bind(r,Eh)});for(let e=0,r=n.length;e<r;e++)t.add(n[e]);if(t.userData.pivot!==void 0&&n.length>0){let e=t.userData.pivot,r=n[0];t.pivot=new V().fromArray(e),t.position.x-=e[0],t.position.y-=e[1],t.position.z-=e[2],r.position.set(0,0,0),delete t.userData.pivot}return t})}_loadNodeShallow(e){let t=this.json,n=this.extensions,r=this;if(this.nodeCache[e]!==void 0)return this.nodeCache[e];let i=t.nodes[e],a=i.name?r.createUniqueName(i.name):``,o=[],s=r._invokeOne(function(t){return t.createNodeMesh&&t.createNodeMesh(e)});return s&&o.push(s),i.camera!==void 0&&o.push(r.getDependency(`camera`,i.camera).then(function(e){return r._getNodeRef(r.cameraCache,i.camera,e)})),r._invokeAll(function(t){return t.createNodeAttachment&&t.createNodeAttachment(e)}).forEach(function(e){o.push(e)}),this.nodeCache[e]=Promise.all(o).then(function(t){let o;if(o=i.isBone===!0?new Dr:t.length>1?new H:t.length===1?t[0]:new zt,o!==t[0])for(let e=0,n=t.length;e<n;e++)o.add(t[e]);if(i.name&&(o.userData.name=i.name,o.name=a),yh(o,i),i.extensions&&vh(n,o,i),i.matrix!==void 0){let e=new ft;e.fromArray(i.matrix),o.applyMatrix4(e)}else i.translation!==void 0&&o.position.fromArray(i.translation),i.rotation!==void 0&&o.quaternion.fromArray(i.rotation),i.scale!==void 0&&o.scale.fromArray(i.scale);if(!r.associations.has(o))r.associations.set(o,{});else if(i.mesh!==void 0&&r.meshCache.refs[i.mesh]>1){let e=r.associations.get(o);r.associations.set(o,{...e})}return r.associations.get(o).nodes=e,o}),this.nodeCache[e]}loadScene(e){let t=this.extensions,n=this.json.scenes[e],r=this,i=new H;n.name&&(i.name=r.createUniqueName(n.name)),yh(i,n),n.extensions&&vh(t,i,n);let a=n.nodes||[],o=[];for(let e=0,t=a.length;e<t;e++)o.push(r.getDependency(`node`,a[e]));return Promise.all(o).then(function(e){for(let t=0,n=e.length;t<n;t++){let n=e[t];n.parent===null?i.add(n):i.add(Om(n))}return r.associations=(e=>{let t=new Map;for(let[e,n]of r.associations)(e instanceof Zn||e instanceof ot)&&t.set(e,n);return e.traverse(e=>{let n=r.associations.get(e);n!=null&&t.set(e,n)}),t})(i),i})}_createAnimationTracks(e,t,n,r,i){let a=[],o=e.name?e.name:e.uuid,s=[];function c(e){e.morphTargetInfluences&&s.push(e.name?e.name:e.uuid)}mh[i.path]===mh.weights?(c(e),e.isGroup&&e.children.forEach(c)):s.push(o);let l;switch(mh[i.path]){case mh.weights:l=No;break;case mh.rotation:l=Fo;break;case mh.translation:case mh.scale:l=Lo;break;default:switch(n.itemSize){case 1:l=No;break;default:l=Lo}}let u=r.interpolation===void 0?E:hh[r.interpolation],d=this._getArrayFromAccessor(n);for(let e=0,n=s.length;e<n;e++){let n=new l(s[e]+`.`+mh[i.path],t.array,d,u);r.interpolation===`CUBICSPLINE`&&this._createCubicSplineTrackInterpolant(n),a.push(n)}return a}_getArrayFromAccessor(e){let t=e.array;if(e.normalized){let e=wh(t.constructor),n=new Float32Array(t.length);for(let r=0,i=t.length;r<i;r++)n[r]=t[r]*e;t=n}return t}_createCubicSplineTrackInterpolant(e){e.createInterpolant=function(e){return new(this instanceof Fo?sh:ah)(this.times,this.values,this.getValueSize()/3,e)},e.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline=!0}};function Oh(e,t,n){let r=t.attributes,i=new un;if(r.POSITION!==void 0){let e=n.json.accessors[r.POSITION],t=e.min,a=e.max;if(t!==void 0&&a!==void 0){if(i.set(new V(t[0],t[1],t[2]),new V(a[0],a[1],a[2])),e.normalized){let t=wh(lh[e.componentType]);i.min.multiplyScalar(t),i.max.multiplyScalar(t)}}else{console.warn(`THREE.GLTFLoader: Missing min/max properties for accessor POSITION.`);return}}else return;let a=t.targets;if(a!==void 0){let e=new V,t=new V;for(let r=0,i=a.length;r<i;r++){let i=a[r];if(i.POSITION!==void 0){let r=n.json.accessors[i.POSITION],a=r.min,o=r.max;if(a!==void 0&&o!==void 0){if(t.setX(Math.max(Math.abs(a[0]),Math.abs(o[0]))),t.setY(Math.max(Math.abs(a[1]),Math.abs(o[1]))),t.setZ(Math.max(Math.abs(a[2]),Math.abs(o[2]))),r.normalized){let e=wh(lh[r.componentType]);t.multiplyScalar(e)}e.max(t)}else console.warn(`THREE.GLTFLoader: Missing min/max properties for accessor POSITION.`)}}i.expandByVector(e)}e.boundingBox=i;let o=new Pn;i.getCenter(o.center),o.radius=i.min.distanceTo(i.max)/2,e.boundingSphere=o}function kh(e,t,n){let r=t.attributes,i=[];function a(t,r){return n.getDependency(`accessor`,t).then(function(t){e.setAttribute(r,t)})}for(let t in r){let n=ph[t]||t.toLowerCase();n in e.attributes||i.push(a(r[t],n))}if(t.indices!==void 0&&!e.index){let r=n.getDependency(`accessor`,t.indices).then(function(t){e.setIndex(t)});i.push(r)}return Xe.workingColorSpace!==`srgb-linear`&&`COLOR_0`in r&&console.warn(`THREE.GLTFLoader: Converting vertex colors from "srgb-linear" to "${Xe.workingColorSpace}" not supported.`),yh(e,t),Oh(e,t,n),Promise.all(i).then(function(){return t.targets===void 0?e:bh(e,t.targets,n)})}var Ah=null;async function jh(){try{let e=await new Am().loadAsync(`./models/zeke-head.glb`),t=t=>e.scene.getObjectByName(t).geometry,n=t(`eyes`),r=[[],[]],i=n.attributes.position;for(let e=0;e<i.count;e+=3){let t=(i.getX(e)+i.getX(e+1)+i.getX(e+2))/3<0?0:1;for(let n=0;n<3;n++)r[t].push(i.getX(e+n),i.getY(e+n),i.getZ(e+n))}let a=r.map(e=>{let t=new Hn;t.setAttribute(`position`,new W(e,3)),t.computeBoundingBox();let n=t.boundingBox.getCenter(new V);return t.translate(-n.x,-n.y,-n.z),t.computeVertexNormals(),{geo:t,center:n}});Ah={face:t(`face`),hat:t(`hat`),eyes:a,meta:e.scene.userData}}catch(e){console.warn(`Zeke parts unavailable, using the procedural head`,e)}}var Mh={on:!1},Nh=new Map,Ph=(e,t)=>(Nh.has(e)||Nh.set(e,t()),Nh.get(e)),Fh={uRim:{value:.35}};function Ih(e,t,n=!1){return Ph(`skin${e}${t}${n}`,()=>{let r={color:e,roughness:t?.5:.62,sheen:t?.5:.3,sheenColor:new U(t?`#e8f5c0`:`#ffd8c0`),sheenRoughness:.6,clearcoat:t?.12:.04,clearcoatRoughness:.5};if(t&&Ah)r.flatShading=!0,r.sheen=.25;else if(t){let e=Vf();r.color=`#ffffff`,r.map=e.map,r.bumpMap=e.bump,r.bumpScale=.6}n&&(r.vertexColors=!0);let i=new lo(r),a=t?`vec3(0.55, 0.75, 0.35)`:`vec3(0.8, 0.5, 0.35)`;return i.onBeforeCompile=e=>{e.uniforms.uRim=Fh.uRim,e.fragmentShader=e.fragmentShader.replace(`#include <common>`,`#include <common>
uniform float uRim;`).replace(`#include <lights_fragment_begin>`,`#include <lights_fragment_begin>
          float rimF = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 3.0);
          totalEmissiveRadiance += ${a} * rimF * uRim * diffuseColor.rgb;`)},i})}function Lh(e,t,n=.9,r=3,i={}){return Mh.on&&(i={flatShading:!0,...i}),Ph(`fab${e}${t}${JSON.stringify(i)}`,()=>{let a=Hf(e,`#bdbdbd`);return a.map.repeat.set(r,r),a.bump.repeat.set(r,r),new co({color:t,map:a.map,bumpMap:a.bump,bumpScale:e===`leather`?.8:.5,roughness:n,...i})})}var Rh=(e,t=.6,n={})=>Ph(`p${e}${t}${JSON.stringify(n)}`,()=>new co({color:e,roughness:t,...n})),zh=(e,t=.3)=>Rh(e,t,{metalness:.95});function Q(e,t,n=0,r=0,i=0){let a=new G(e,t);return a.position.set(n,r,i),a.castShadow=!0,a.receiveShadow=!0,a}function Bh(e,{seg:t=20,gap:n=0,capTop:r=!1,capBottom:i=!1,uvScale:a=[1,1]}={}){Mh.on&&(t=Math.max(7,Math.round(t*.5)));let o=[],s=[],c=[],l=n/2,u=Math.PI*2-n,d=t+1,f=0;e.forEach((n,r)=>{r>0&&(f+=Math.abs(n.y-e[r-1].y));for(let e=0;e<=t;e++){let r=l+e/t*u;o.push((n.x||0)+Math.sin(r)*n.rx,n.y,(n.z||0)+Math.cos(r)*n.rz),s.push(e/t*a[0],f*a[1]*4)}});for(let n=0;n<e.length-1;n++)for(let r=0;r<t;r++){let t=n*d+r,i=t+1,a=t+d,o=a+1;e[n].y>e[n+1].y?c.push(t,a,i,i,a,o):c.push(t,i,a,i,o,a)}let p=(n,r)=>{let i=e[n],a=o.length/3;o.push(i.x||0,i.y,i.z||0),s.push(.5,.5);for(let e=0;e<t;e++){let t=n*d+e;r?c.push(a,t+1,t):c.push(a,t,t+1)}},m=e[0].y>e[e.length-1].y;r&&p(m?0:e.length-1,m),i&&p(m?e.length-1:0,!m);let h=new Hn;return h.setAttribute(`position`,new W(o,3)),h.setAttribute(`uv`,new W(s,2)),h.setIndex(c),h.computeVertexNormals(),h}function Vh(e,t,n){let r=[],i=[];for(let a=0;a<e.length;a++){let o=e[a],s=e[Math.min(a+1,e.length-1)].clone().sub(e[Math.max(a-1,0)]).normalize(),c=new V().crossVectors(s,t[a]).normalize().multiplyScalar(n/2);if(r.push(o.x+c.x,o.y+c.y,o.z+c.z,o.x-c.x,o.y-c.y,o.z-c.z),a<e.length-1){let e=a*2;i.push(e,e+1,e+2,e+1,e+3,e+2)}}let a=new Hn;return a.setAttribute(`position`,new W(r,3)),a.setIndex(i),a.computeVertexNormals(),a}function Hh(e,t){for(let n=0;n<e.length-1;n++){let r=e[n],i=e[n+1];if(t>=r.y&&t<=i.y||t<=r.y&&t>=i.y){let e=(t-r.y)/(i.y-r.y||1);return{rx:Ld(r.rx,i.rx,e),rz:Ld(r.rz,i.rz,e)}}}return e[t<e[0].y?0:e.length-1]}var Uh=(e,t,n=t)=>e.map(e=>({...e,rx:e.rx+t,rz:e.rz+n})),Wh=(e,t,n)=>{let r=Id(e.dot(t),-1,1),i=Math.acos(r);return Math.exp(-(i*i)/(n*n))},Gh=(e,t,n)=>new V(e,t,n).normalize(),Kh={sockets:[Gh(-.47,-.01,.88),Gh(.47,-.01,.88)],brows:[Gh(-.4,.26,.88),Gh(.4,.26,.88)],cheeks:[Gh(-.62,-.3,.72),Gh(.62,-.3,.72)],temples:[Gh(-.95,.12,.25),Gh(.95,.12,.25)],nose:Gh(0,-.3,.95),nostrils:[Gh(-.055,-.4,.92),Gh(.055,-.4,.92)]};function qh(e){let t=1,n=0;for(let r of Kh.sockets){let i=Wh(e,r,.36);t-=.11*i,n+=i*.5}for(let n of Kh.brows)t+=.035*Wh(e,n,.22);for(let n of Kh.cheeks)t+=.045*Wh(e,n,.3);for(let n of Kh.temples)t-=.035*Wh(e,n,.35);t+=.035*Wh(e,Kh.nose,.13);for(let r of Kh.nostrils){let i=Wh(e,r,.05);t-=.03*i,n+=i}let r=Math.exp(-(((e.y+.585)/.03)**2))*Math.exp(-((e.x/.17)**2))*q(.55,.9,e.z);t-=.025*r,n+=r*.8;let i=e.clone().multiplyScalar(t);i.x*=.9,i.y*=1.1;let a=q(-.25,.75,e.y);i.x*=1+.2*a,i.z*=1+.1*a+.16*a*q(.1,-.9,e.z),i.y*=1+.08*a;let o=q(.05,-.95,e.y);return i.x*=1-.58*o,i.z*=1-.3*o*q(.3,-.7,e.z),i.y-=.2*o*o,i.z+=.07*o*q(0,1,e.z),{p:i,ao:Id(n,0,1)}}function Jh(e,t){let n=1,r=0;for(let t of[-1,1]){let i=Wh(e,Gh(t*.33,.02,.94),.2);n-=.07*i,r+=i*.5,n+=.04*Wh(e,Gh(t*.33,.2,.92),.2),n+=.05*Wh(e,Gh(t*.55,-.22,.8),.25)}let i=Math.exp(-((e.x/.08)**2))*q(.1,-.05,e.y)*q(-.42,-.3,e.y)*q(.8,.98,e.z);n+=.13*i+.05*Wh(e,Gh(0,-.36,.93),.1);let a=Math.exp(-(((e.y+.55)/.035)**2))*Math.exp(-((e.x/.22)**2))*q(.6,.9,e.z);n-=.03*a,r+=a,n+=.05*Wh(e,Gh(0,-.8,.6),.25);let o=e.clone().multiplyScalar(n);o.x*=.86,o.y*=1.1;let s=q(0,-.9,e.y);return o.x*=1-(t.jaw??.22)*s,o.z*=1-.1*s*q(.2,-.7,e.z),o.y-=.08*s,{p:o,ao:Id(r,0,1)}}function Yh(e,t=64){let n=new Ja(1,t,Math.round(t*.75)),r=n.attributes.position,i=new Float32Array(r.count*3),a=new V;for(let t=0;t<r.count;t++){a.fromBufferAttribute(r,t).normalize();let{p:n,ao:o}=e(a);r.setXYZ(t,n.x,n.y,n.z);let s=1-o*.35;i[t*3]=s,i[t*3+1]=s,i[t*3+2]=s}return n.setAttribute(`color`,new On(i,3)),n.computeVertexNormals(),n}var Xh={drifter:{name:`Drifter (from the wreck)`,color:`#3a3133`,band:`#6a2226`,crown:.2,brim:.4,curl:.1,concho:!1,price:0},cattleman:{name:`Cattleman`,color:`#6e4a2c`,band:`#3a2616`,crown:.2,brim:.36,curl:.12,concho:!0,price:0},gambler:{name:`Black Gambler`,color:`#222024`,band:`#8a1f1f`,crown:.16,brim:.34,curl:.04,concho:!1,price:45},sheriff:{name:`Lawman White`,color:`#e8e0cf`,band:`#2a2018`,crown:.22,brim:.4,curl:.14,concho:!0,price:70},sombrero:{name:`Grand Sombrero`,color:`#d2b27a`,band:`#b0302a`,crown:.28,brim:.72,curl:-.02,concho:!1,price:90,sombrero:!0},stetson:{name:`Tall Ten-Gallon`,color:`#8c6a44`,band:`#5a3a1e`,crown:.34,brim:.44,curl:.18,concho:!0,price:120},bowler:{name:`Derby`,color:`#3a2a20`,band:`#1a1410`,crown:.14,brim:.2,curl:.06,concho:!1,price:35,bowler:!0}},Zh={duster:{name:`Trail Duster`,price:0},shirt:{name:`Shirtsleeves & Suspenders`,price:0},poncho:{name:`Serape Poncho`,price:40}};function Qh(e=`cattleman`,t=1){let n=Xh[e]||Xh.cattleman,r=new H;if(e===`drifter`&&Ah){let e=Q(Ah.hat,Ph(`drifterMat`,()=>new co({vertexColors:!0,flatShading:!0,roughness:.8,side:2}))),n=Ah.hat.boundingBox||(Ah.hat.computeBoundingBox(),Ah.hat.boundingBox),i=n.getCenter(new V),a=1.15;return e.scale.setScalar(a),e.position.set(-i.x*a,-(n.min.y+(n.max.y-n.min.y)*.18)*a,-i.z*a),r.add(e),r.userData.drifter={offset:e.position.clone()},r.scale.setScalar(t/1.13),r}let i=Lh(`canvas`,n.color,.95,2,{side:2}),a=(e,t)=>{let r=Math.hypot(e,t),i=Id((r-.13)/(n.brim-.13),0,1),a=Math.abs(e)/Math.max(r,1e-4);return n.sombrero?.1*i*i*i:n.curl*i*i*a**2.2-.03*i*i*(1-a)},o=new Ga(.13,n.brim,48,4);o.rotateX(-Math.PI/2);let s=o.attributes.position;for(let e=0;e<s.count;e++)s.setY(e,a(s.getX(e),s.getZ(e)));o.computeVertexNormals(),r.add(Q(o,i));let c=[];for(let e=0;e<=64;e++){let t=e/64*Math.PI*2,r=Math.cos(t)*n.brim,i=Math.sin(t)*n.brim;c.push(new V(r,a(r,i),i))}r.add(Q(new Za(new Ni(c,!0),64,.006,4,!0),Rh(n.band,.7)));let l=n.crown,u=new Ha((n.bowler?[[.14,0],[.15,.04],[.15,.08],[.13,.12],[.09,.14],[0,.15]]:n.sombrero?[[.15,0],[.13,l*.5],[.1,l*.85],[.06,l],[0,l]]:[[.14,0],[.145,l*.4],[.14,l*.8],[.125,l*.97],[.08,l*.93],[.03,l*.85],[0,l*.84]]).map(([e,t])=>new z(e,t)),32),d=u.attributes.position;for(let e=0;e<d.count;e++){let t=d.getX(e),r=d.getY(e),i=d.getZ(e),a=t*.92,o=i*1.08,s=r;if(!n.bowler&&!n.sombrero&&r>l*.55){let e=(r-l*.55)/(l*.45);s-=.05*Math.exp(-(t*t)/.0025)*e,i>.05&&(a*=1-.2*e*(i/.15))}d.setXYZ(e,a,s,o)}u.computeVertexNormals(),r.add(Q(u,i));let f=Q(new bi(.139,.143,.035,32,1,!0),Lh(`leather`,n.band,.6,1));if(f.scale.set(.93,1,1.09),f.position.y=.03,r.add(f),n.concho){let e=new ea;for(let t=0;t<10;t++){let n=t/10*Math.PI*2-Math.PI/2,r=t%2?.01:.022;t===0?e.moveTo(Math.cos(n)*r,Math.sin(n)*r):e.lineTo(Math.cos(n)*r,Math.sin(n)*r)}let t=Q(new Ra(e,{depth:.004,bevelEnabled:!0,bevelSize:.002,bevelThickness:.002,bevelSegments:1}),zh(`#dcdce2`,.22));t.position.set(.105,.03,.112),t.rotation.y=.75,r.add(t)}return r.scale.setScalar(t),r}function $h(){let e=new H,t=zh(`#8d949c`,.28),n=Q(new _i(.028,.085,.036),Lh(`leather`,`#5a3a24`,.5,1),0,-.045,-.012);n.rotation.x=.35;let r=Q(new _i(.03,.045,.085),t,0,0,.035),i=Q(new bi(.02,.02,.045,8),t,0,.004,.045);i.rotation.x=Math.PI/2;let a=Q(new bi(.011,.012,.13,10),t,0,.012,.14);a.rotation.x=Math.PI/2;let o=Q(new Ya(.016,.005,6,12),Rh(`#1a3a2a`,.2,{emissive:`#4dffb0`,emissiveIntensity:2.8}),0,.012,.11),s=o.clone();return s.position.z=.15,e.add(n,r,i,a,o,s),e.userData.muzzle=new V(0,.012,.21),e}function eg(e={}){let t={...e},n=t.species===`alien`;Mh.on=n&&!!Ah,Mh.on&&(t={shirt:`#e8e3da`,pants:`#2f292a`,boots:`#241e1d`,bandana:`#c23a2e`,...t},t.skin=t.skin||Ah.meta.skin||`#c0c386`);let r=n?{thigh:.47,shin:.46,ankle:.072,hipW:.095,shoulderW:.178,shoulderY:.455,torso:.53,upper:.3,fore:.27,neck:.065}:{thigh:.44,shin:.43,ankle:.075,hipW:.1,shoulderW:.2,shoulderY:.47,torso:.55,upper:.29,fore:.25,neck:.08},i=r.thigh+r.shin+r.ankle,a=Ih(t.skin||(n?`#8ea368`:`#d9a57e`),n),o=Ih(t.skin||(n?`#8ea368`:`#d9a57e`),n,!0),s=Lh(`linen`,t.shirt||`#e9e0cc`,.92,3),c=Lh(n?`canvas`:`denim`,t.pants||`#5a4632`,.92,3),l=Lh(`leather`,t.boots||`#6a4428`,.55,2),u=Lh(`leather`,`#3a2616`,.55,2),d=t.dress?Lh(`linen`,t.dress,.85,3):null,f=d||s,p=new H,m=new H;p.add(m);let h=new H;h.position.y=i-.02,m.add(h);let g=new H;h.add(g),h.add(Q(Bh([{y:-.13,rx:.13,rz:.1},{y:-.06,rx:.15,rz:.108},{y:.02,rx:.148,rz:.105},{y:.08,rx:.14,rz:.1}],{seg:22,capBottom:!0}),d||c));let _=[];for(let e of[-1,1]){let t=new H;t.position.set(e*r.hipW,-.03,0),h.add(t),t.add(Q(Bh([{y:.07,rx:.1,rz:.1},{y:-.06,rx:.092,rz:.095},{y:-.25,rx:.078,rz:.08},{y:-r.thigh+.02,rx:.064,rz:.066}],{seg:16}),c));let i=new H;i.position.y=-r.thigh,t.add(i),i.add(Q(new Ja(.066,12,10),c)),i.add(Q(Bh([{y:.02,rx:.064,rz:.066},{y:-.1,rx:.063,rz:.068},{y:-.22,rx:.056,rz:.058}],{seg:14}),c)),i.add(Q(Bh([{y:-.17,rx:.074,rz:.078},{y:-.2,rx:.068,rz:.072},{y:-.33,rx:.056,rz:.061},{y:-r.shin+.02,rx:.052,rz:.058}],{seg:16,uvScale:[2,1]}),l));for(let e of[-1,1])i.add(Q(new _i(.018,.035,.004),l,e*.074,-.165,0));let a=new H;a.position.y=-r.shin,i.add(a);let o=Bh([{y:.06,rx:.043,rz:.05},{y:0,rx:.05,rz:.062},{y:-.08,rx:.049,rz:.05},{y:-.15,rx:.042,rz:.035},{y:-.2,rx:.026,rz:.024},{y:-.225,rx:.008,rz:.012}].map(e=>({...e,z:-r.ankle+.004+e.rz})),{seg:14,capTop:!0,capBottom:!0});o.rotateX(-Math.PI/2),a.add(Q(o,l)),a.add(Q(new _i(.075,.042,.06),Rh(`#2a1a10`,.7),0,-r.ankle+.018,-.03));let s=Q(new _i(.09,.01,.2),Rh(`#2a1a10`,.8),0,-r.ankle-.002,.075);if(a.add(s),n){let e=new H;e.position.set(0,-r.ankle+.035,-.07),e.add(Q(new Ya(.05,.004,4,16,Math.PI),zh(`#c8c8ce`))),e.children[0].rotation.x=Math.PI/2,e.children[0].rotation.z=Math.PI;let t=new ea;for(let e=0;e<16;e++){let n=e/16*Math.PI*2,r=e%2?.006:.017;e?t.lineTo(Math.cos(n)*r,Math.sin(n)*r):t.moveTo(Math.cos(n)*r,Math.sin(n)*r)}let n=Q(new Ra(t,{depth:.002,bevelEnabled:!1}),zh(`#d8d8de`),0,0,-.06);n.rotation.y=Math.PI/2,e.add(n),a.add(e),a.userData.rowel=n}_.push({thigh:t,knee:i,foot:a,side:e,base:t.position.clone()})}let v=n?[{y:.02,rx:.138,rz:.098},{y:.12,rx:.126,rz:.092},{y:.24,rx:.14,rz:.1},{y:.34,rx:.156,rz:.106},{y:.42,rx:.164,rz:.1},{y:.47,rx:.152,rz:.086},{y:.51,rx:.1,rz:.066},{y:.535,rx:.05,rz:.048}]:[{y:.02,rx:.15,rz:.105},{y:.12,rx:.145,rz:.1},{y:.25,rx:.16,rz:.11},{y:.36,rx:.18,rz:.12},{y:.44,rx:.185,rz:.11},{y:.49,rx:.17,rz:.09},{y:.53,rx:.1,rz:.07},{y:.555,rx:.06,rz:.055}],y=Q(Bh(v,{seg:26,uvScale:[2,1]}),f);g.add(y);let b=new H;g.add(b);let x=(e,t,n=1)=>{let r=Hh(v,e);return n*r.rz*Math.sqrt(Math.max(0,1-(t/r.rx)**2))},S=Q(Bh([{y:.515,rx:.062,rz:.058},{y:.56,rx:.07,rz:.066},{y:.575,rx:.08,rz:.075}],{seg:18,gap:.7}),s);if(S.material.side=2,t.dress||g.add(S),!t.dress){for(let e=.1;e<.5;e+=.075)g.add(Q(new Ja(.0065,6,4),Rh(`#d9cdb4`,.4),0,e,x(e,0)+.004));for(let e of[-1,1]){let t=Q(new _i(.06,.05,.008),s,e*.07,.37,x(.37,e*.07)+.002);t.rotation.y=e*.25,b.add(t)}}if(!t.dress&&!t.vest&&t.suspenders!==!1)for(let e of[-1,1]){let t=[],n=[],r=(e,r,i)=>{let a=x(r,e,i),o=new V(e,0,a).normalize();t.push(new V(e+o.x*.006,r,a+o.z*.006)),n.push(o)};for(let t=.05;t<=.46;t+=.05)r(e*Ld(.07,.092,t/.46),t,1);for(let r=1;r<6;r++){let i=r/6*Math.PI,a=Hh(v,.47),o=e*.095,s=Math.cos(i)*a.rz*.9,c=.47+Math.sin(i)*.035;t.push(new V(o,c,s)),n.push(new V(0,Math.sin(i),Math.cos(i)).normalize())}for(let t=.46;t>=.05;t-=.05)r(e*Ld(.03,.092,(t-.05)/.41),t,-1);g.add(Q(Vh(t,n,.032),u));for(let t of[.075]){let n=Q(new _i(.03,.028,.008),zh(`#c9a24a`,.35),e*.071,t,x(t,e*.071)+.012);g.add(n)}}if(t.vest){let e=Q(Bh(Uh(v.slice(0,6),.012),{seg:24,gap:.55}),Lh(`leather`,t.vest,.6,2,{side:2}));g.add(e)}if(t.star){let e=new ea;for(let t=0;t<10;t++){let n=t/10*Math.PI*2-Math.PI/2,r=t%2?.014:.034;t?e.lineTo(Math.cos(n)*r,Math.sin(n)*r):e.moveTo(Math.cos(n)*r,Math.sin(n)*r)}let t=Q(new Ra(e,{depth:.005,bevelEnabled:!0,bevelSize:.002,bevelThickness:.002,bevelSegments:1}),zh(`#e8c35a`,.25),-.1,.38,x(.38,-.1)+.012);g.add(t)}if(t.apron){let e=Q(new Wa(.28,.55),Lh(`linen`,t.apron,.9,2,{side:2}),0,-.06,x(.05,0)+.015);g.add(e)}g.add(Q(Bh([{y:0,rx:.152,rz:.11},{y:.05,rx:.148,rz:.106}],{seg:24}),u)),g.add(Q(new _i(.065,.048,.012),zh(`#c9a24a`,.35),0,.025,.114));let C=$h(),w=new H;if(w.position.set(-.165,-.03,.01),g.add(w),n||t.gun){let e=Q(Bh([{y:.03,rx:.026,rz:.045},{y:-.08,rx:.022,rz:.035},{y:-.14,rx:.016,rz:.022}],{seg:10,capBottom:!0}),u,0,-.02,0);e.rotation.x=.15,w.add(e),C.rotation.set(Math.PI/2+.15,0,0),C.position.set(0,0,0),w.add(C)}let T=[],E=[],D=[{y:.04,rx:.058,rz:.056},{y:-.06,rx:.055,rz:.054},{y:-.2,rx:.048,rz:.047},{y:-r.upper+.02,rx:.046,rz:.045}];for(let e of[-1,1]){let t=new H;t.position.set(e*r.shoulderW,r.shoulderY,0),g.add(t);let i=Q(new Ja(.062,14,10),f,-e*.01,.005,0);t.add(i),E.push(i),t.add(Q(Bh(D,{seg:14,capTop:!0}),f));let o=new H;o.position.y=-r.upper,t.add(o);let s=Q(new Ya(.043,.017,8,16),f,0,.01,0);s.rotation.x=Math.PI/2,o.add(s),E.push(s),o.add(Q(new Ja(.036,10,8),a)),o.add(Q(Bh([{y:0,rx:.036,rz:.034},{y:-.07,rx:.037,rz:.033},{y:-.2,rx:.027,rz:.023},{y:-r.fore,rx:.024,rz:.021}],{seg:12}),a));let c=new H;c.position.y=-r.fore,o.add(c);let l=Q(new Ja(1,12,10),a,0,-.045,0);l.scale.set(.018,.05,.036),c.add(l);let u=[],d=n?3:4,p=n?[.05,.045]:[.035,.03];for(let e=0;e<d;e++){let t=(e-(d-1)/2)*(n?.022:.016),r=new H;r.position.set(0,-.085,t),r.rotation.x=t*-2.5,c.add(r),r.add(Q(new vi(n?.0085:.009,p[0],3,6),a,0,-p[0]/2,0));let i=new H;i.position.y=-p[0]-.004,r.add(i),i.add(Q(new vi(n?.0075:.008,p[1],3,6),a,0,-p[1]/2,0)),n&&i.add(Q(new Ja(.0115,8,6),a,0,-p[1]-.006,0)),u.push([r,i])}let m=new H;m.position.set(-e*.008,-.035,.03),m.rotation.set(-.5,0,-e*.35),c.add(m),m.add(Q(new vi(.009,n?.05:.03,3,6),a,0,-.03,0)),T.push({shoulder:t,elbow:o,hand:c,fingers:u,thumb:m,side:e})}let O=new H;O.position.y=v[v.length-1].y-.01,g.add(O),O.add(Q(Bh(n?[{y:-.03,rx:.055,rz:.052},{y:.03,rx:.043,rz:.044},{y:.1,rx:.04,rz:.045}]:[{y:-.03,rx:.062,rz:.06},{y:.06,rx:.055,rz:.055},{y:.11,rx:.052,rz:.055}],{seg:14}),a)),t.bandana!==!1&&!t.dress&&O.add(Q(Bh([{y:-.005,rx:n?.056:.068,rz:n?.054:.066},{y:.045,rx:n?.046:.062,rz:n?.047:.062}],{seg:16}),Ph(`bandana${t.bandana}${Mh.on}`,()=>new co({map:Mh.on?null:Wf(),color:Mh.on?`#c23a2e`:t.bandana&&t.bandana!==!0?t.bandana:`#ffffff`,roughness:.85,flatShading:Mh.on}))));let k=new H;k.position.y=r.neck,O.add(k);let A={eyes:[],lids:[],brows:[],mouth:null,hatAnchor:null},j=null;if(n){let e=Ah?.146:.158,t=new V(0,.2,.012),n=Q(Yh(qh,Ah?20:72),Ah?a:o);if(n.scale.setScalar(e),n.position.copy(t),k.add(n),Ah){let e=new H;e.name=`meshyFace`,e.scale.setScalar(1.08),e.position.set(0,.02,.045),k.add(e),e.add(Q(Ah.face,Ph(`meshyFaceMat`,()=>new co({vertexColors:!0,flatShading:!0,roughness:.6}))));let t=Ph(`meshyEye`,()=>new lo({color:`#050607`,roughness:.06,clearcoat:1,clearcoatRoughness:.03,iridescence:.6,iridescenceIOR:1.6}));A.meshyEyes=Ah.eyes.map(n=>{let r=Q(n.geo,t);return r.position.copy(n.center),e.add(r),r}),A.meshyFace=e}let r=Ph(`alienEye`,()=>new lo({color:`#040706`,roughness:.04,metalness:0,clearcoat:1,clearcoatRoughness:.03,iridescence:.8,iridescenceIOR:1.7,iridescenceThicknessRange:[180,520],envMapIntensity:1.6}));if(Ah||Kh.sockets.forEach((n,i)=>{let o=i===0?-1:1,{p:s}=qh(n),c=new H;c.position.copy(s).multiplyScalar(e).add(t);let l=new V(0,1,0).cross(n).normalize(),u=n.clone().cross(l).normalize(),d=qh(n).p,f=qh(n.clone().addScaledVector(l,.02).normalize()).p,p=qh(n.clone().addScaledVector(u,.02).normalize()).p,m=f.sub(d).cross(p.sub(d)).normalize();m.dot(n)<0&&m.negate(),m.x*=.85,m.normalize(),c.quaternion.setFromUnitVectors(new V(0,0,1),m),c.position.addScaledVector(m,-.004),c.rotateZ(o*.36),k.add(c);let h=new H;c.add(h);let g=new Ja(1,32,22),_=g.attributes.position;for(let e=0;e<_.count;e++){let t=_.getX(e),n=_.getY(e),r=t*o,i=(.72+.34*r)*(1-.18*Math.abs(t)**4);_.setY(e,n*i+.12*r*(1-n*n)*.5)}g.computeVertexNormals();let v=Q(g,r);v.scale.set(.077,.058,.024),h.add(v);let y=new H;c.add(y);let b=Q(new Ja(1,24,10,0,Math.PI*2,0,Math.PI/2),a);b.scale.set(.083,.064,.029),y.add(b),y.rotation.x=-1.7,A.lids.push(y),A.eyes.push(h);let x=qh(Kh.brows[i]).p.multiplyScalar(e).add(t),S=Q(new vi(.006,.045,3,8),a,x.x,x.y+.004,x.z-.008);S.rotation.z=Math.PI/2+o*.28,S.rotation.y=o*.45,k.add(S),A.brows.push({m:S,y0:S.position.y})}),!Ah){let n=qh(Gh(0,-.585,.81)).p.multiplyScalar(e).add(t),r=new H;r.position.copy(n),r.position.z-=.002,r.rotation.x=-.35,k.add(r);let i=Q(new Ja(1,12,8),Rh(`#1a1810`,.8));i.scale.set(.022,.002,.008),r.add(i);let a=Rh(`#6d7c4c`,.5),o=Q(new Ya(.03,.0035,5,16,Math.PI*.62),a);o.rotation.z=Math.PI+Math.PI*.19,o.position.y=.024,o.scale.y=.75;let s=Q(new Ya(.024,.004,5,16,Math.PI*.55),a);s.rotation.z=Math.PI+Math.PI*.225,s.position.y=.017,s.scale.y=.6;let c=new H;c.add(s),r.add(o,c),o.position.y-=.024,s.position.y-=.024,o.position.y+=.004,A.mouth={inner:i,lower:c}}A.hatAnchor={y:qh(Gh(0,1,0)).p.multiplyScalar(e).add(t).y-.1,z:-.005,rx:-.12,scale:1.13}}else{let e=.112,n=new V(0,.14,.01),r=e=>Jh(e,t),i=Q(Yh(r,48),o);i.scale.setScalar(e),i.position.copy(n),k.add(i);for(let i of[-1,1]){let o=Gh(i*.33,.02,.94),s=r(o).p.multiplyScalar(e).add(n),c=new H;c.position.copy(s).addScaledVector(o,-.008),k.add(c);let l=new H;c.add(l),l.add(Q(new Ja(.013,12,10),Rh(`#f2ece2`,.25))),l.add(Q(new Ja(.0072,10,8),Rh(t.eyes||`#3a2a1a`,.2),0,0,.009));let u=new H;c.add(u);let d=Q(new Ja(.0145,12,6,0,Math.PI*2,0,Math.PI/2),a);u.add(d),u.rotation.x=-.5,A.lids.push(u),A.eyes.push(l);let f=r(Gh(i*.33,.21,.92)).p.multiplyScalar(e).add(n),p=Q(new vi(.005,.03,3,6),Rh(t.hair||`#3a2a1c`,.9),f.x,f.y,f.z+.004);p.rotation.z=Math.PI/2+i*.1,k.add(p),A.brows.push({m:p,y0:p.position.y});let m=r(Gh(i*1,0,-.05)).p.multiplyScalar(e).add(n),h=Q(new Ja(.024,10,8),a,m.x,m.y,m.z);h.scale.set(.45,1,.75),k.add(h)}let s=r(Gh(0,-.55,.84)).p.multiplyScalar(e).add(n),c=new H;c.position.copy(s),k.add(c);let l=Q(new Ja(1,10,6),Rh(`#2a1410`,.8));l.scale.set(.016,.002,.006),c.add(l);let u=new H;u.add(Q(new vi(.004,.026,3,6),Rh(`#a8604a`,.5),0,-.004,.002)),u.children[0].rotation.z=Math.PI/2,c.add(u);let d=Q(new vi(.0035,.03,3,6),Rh(`#9a5a44`,.5),0,.004,.002);d.rotation.z=Math.PI/2,c.add(d),A.mouth={inner:l,lower:u};let f=Lh(`canvas`,t.hair||`#3a2a1c`,.95,4),p=Q(new Ja(1,24,16,0,Math.PI*2,0,Math.PI*.46),f,n.x,n.y+.012,n.z-.012);if(p.scale.set(e*.97,e*1.14,e*1.07),p.rotation.x=-.25,k.add(p),t.mustache){let e=Rh(t.hair||`#3a2a1c`,.95);for(let t of[-1,1]){let n=Q(new vi(.009,.035,3,6),e,s.x+t*.02,s.y+.014,s.z+.006);n.rotation.z=Math.PI/2-t*.35,k.add(n)}}if(t.beard){let r=Q(new Ja(1,16,12,0,Math.PI*2,Math.PI*.42,Math.PI*.58),Lh(`canvas`,t.hair||`#9a9a9a`,.95,4),n.x,n.y-.012,n.z+.008);r.scale.set(e*.95,e*1.12,e*1.02),k.add(r)}if(t.longHair){let t=Q(new Ja(1,16,12),f,n.x,n.y-.01,n.z-.035);t.scale.set(e*1.05,e*1.25,e*.95),k.add(t),k.add(Q(new vi(.05,.18,4,8),f,0,n.y-.16,-.08))}A.hatAnchor={y:n.y+e*.62,z:-.005,rx:-.06,scale:.98}}t.hat&&!(n&&Ah)&&(j=Qh(t.hat,A.hatAnchor.scale),j.position.set(0,A.hatAnchor.y,A.hatAnchor.z),j.rotation.x=A.hatAnchor.rx,k.add(j)),A.hat=j;let M=null;if(n){M=new H;let e=zh(`#b87340`,.32),t=zh(`#c9a24a`,.28),n=zh(`#5a6068`,.4),r=new co({color:`#0a2a2a`,emissive:`#58ffd8`,emissiveIntensity:.4}),i=new lo({color:`#7dffe0`,emissive:`#2affc8`,emissiveIntensity:1.2,roughness:.1,transmission:.3,transparent:!0,opacity:.85}),a=Q(new _i(.2,.3,.035),Lh(`leather`,`#3a2616`,.5,1),0,.33,-.135);M.add(a);let o=[];for(let i of[-1,1]){let a=Q(new bi(.055,.055,.3,16),e,i*.075,.33,-.2),s=Q(new Ja(.055,16,8,0,Math.PI*2,0,Math.PI/2),e,i*.075,.48,-.2);for(let e of[.24,.42]){let n=Q(new Ya(.057,.006,6,20),t,i*.075,e,-.2);n.rotation.x=Math.PI/2,M.add(n)}let c=Q(new bi(.035,.05,.07,14,1,!0),n,i*.075,.145,-.2);c.material.side=2;let l=Q(new bi(.036,.036,.012,14),r,i*.075,.115,-.2),u=Q(new _i(.006,.12,.07),t,i*.132,.22,-.2);u.rotation.z=i*.2,M.add(a,s,c,l,u),o.push(new V(i*.075,.1,-.2))}let s=Q(new Ja(.038,16,12),i,0,.4,-.245),c=Q(new Ya(.04,.007,6,18),t,0,.4,-.245),l=Q(new bi(.022,.022,.01,14),t,0,.27,-.245);l.rotation.x=Math.PI/2,M.add(s,c,l);for(let e of[-1,1]){let t=Q(new Za(new Ni([new V(e*.08,.44,-.13),new V(e*.1,.53,-.04),new V(e*.1,.52,.07),new V(e*.09,.42,.125),new V(e*.085,.3,.13)]),16,.011,5),Lh(`leather`,`#3a2616`,.5,1));t.scale.z=1,M.add(t)}let u=Q(new _i(.2,.02,.012),Lh(`leather`,`#3a2616`,.5,1),0,.33,.135),d=Q(new _i(.035,.03,.01),t,0,.33,.143);M.add(u,d),M.userData={nozzles:o,nozzleGlow:r,coreMat:i},M.visible=!1,g.add(M)}Mh.on=!1;let ee=new ig({jetpack:M,root:p,body:m,hips:h,spine:g,neck:O,head:k,legs:_,arms:T,face:A,gun:C,holster:w,legLen:i,P:r,alien:n,o:t,torsoRings:v,shirtOnly:b,shirtBits:E});return ee.buildClothes(),n&&Ah&&t.hat&&ee.setHat(t.hat),ee}var tg=new ft,ng=new ft,rg=new V;new V;var ig=class t{constructor(e){Object.assign(this,e),this.phase=0,this.cycle=0,this.t=Math.random()*10,this.blinkT=1+Math.random()*3,this.gunInHand=!1,this.lookYaw=0,this.lookPitch=0,this.lastSpeed=0,this.accel=0,this.lastYaw=null,this.yawRate=0,this.wasGrounded=!0,this.lastVy=0,this.land=0,this.standY=this.P.ankle+.03+.982*(this.P.thigh+this.P.shin),this.hipY=this.standY,this.gazeT=0,this.gaze=new z,this.gazeNow=new z,this.talkT=0,this.weightT=4,this.weight=1,this.lassoSpin=0,this.cloths=[],this.outfit=null,this.feetPrev=[new V,new V];for(let e of this.legs)e.thigh.rotation.order=`XYZ`}buildClothes(){let{alien:t,o:n,spine:r,hips:i,arms:a,legs:o,neck:s}=this,c=()=>{let e=[];for(let t of o){let n=t.thigh.getWorldPosition(new V),r=t.knee.getWorldPosition(new V),i=t.foot.getWorldPosition(new V);e.push({a:n,b:r,r:.115},{a:r,b:i,r:.095})}let t=o[0].thigh.getWorldPosition(new V),n=o[1].thigh.getWorldPosition(new V);return e.push({a:t,b:n,r:.16}),e};if(this.parts={},Mh.on=t&&!!Ah,t){let t=Ah?Ph(`coatLined`,()=>{let e=Lh(`leather`,`#352c2d`,.7,3,{side:2,flatShading:!0}).clone();return e.onBeforeCompile=e=>{e.fragmentShader=e.fragmentShader.replace(`#include <color_fragment>`,`#include <color_fragment>
  if (!gl_FrontFacing) diffuseColor.rgb = vec3(0.42, 0.07, 0.07);`)},e}):Lh(`leather`,`#7a573a`,.72,3,{side:2}),o=new H,l=Uh(this.torsoRings.slice(0,7),.02,.02);o.add(Q(Bh(l,{seg:26,gap:.62,uvScale:[2,1]}),t)),o.add(Q(Bh(Ah?[{y:.5,rx:.07,rz:.066},{y:.55,rx:.072,rz:.068},{y:.585,rx:.085,rz:.08}]:[{y:.49,rx:.085,rz:.075},{y:.56,rx:.09,rz:.08},{y:.61,rx:.11,rz:.1}],{seg:18,gap:1.2}),t));for(let e of[-1,1]){let n=Q(new Wa(.06,.24),t,e*.058,.39,l[4].rz*.9+.01);n.rotation.set(-.12,e*.5,e*.12),o.add(n)}r.add(o);let u=[];for(let e of a){let n=Q(Bh(Uh([{y:.04,rx:.056,rz:.054},{y:-.06,rx:.055,rz:.054},{y:-.2,rx:.048,rz:.047},{y:-this.P.upper,rx:.046,rz:.045}],.009),{seg:14,capTop:!0}),t),r=Q(new Ja(.064,Ah?8:14,Ah?6:10),t,-e.side*.016,0,0);Ah&&r.scale.set(.95,.8,.95);let i=Q(Bh([{y:.03,rx:.058,rz:.056},{y:-.12,rx:.052,rz:.05},{y:-this.P.fore+.02,rx:.05,rz:.048},{y:-this.P.fore+.005,rx:.056,rz:.054}],{seg:14}),t);e.shoulder.add(n,r),e.elbow.add(i),u.push(n,r,i)}let d=.62,f=new Dm({cols:26,rows:12,anchor:i,rest:(e,t)=>{let n=d/2+e/25*(Math.PI*2-d),r=.07-t*.066,i=.165+t*.014,a=.12+t*.016;return new V(Math.sin(n)*i,r,Math.cos(n)*a-t*.004)},pinned:(e,t)=>t<2,memory:e=>.1*(1-e/12)**2+.006,colliders:c,material:t,uv:(e,t)=>[e/25*3,1-t/11*1.6],iterations:4});this.cloths.push(f),this.parts.duster={groups:[o,...u],cloth:f};let p=new co({map:Uf(),roughness:.95,side:2});p.map.wrapS=p.map.wrapT=e;let m=this.torsoRings,h=new Dm({cols:30,rows:11,wrap:!0,anchor:r,rest:(e,t)=>{let n=e/30*Math.PI*2,r=Ld(.075,.5*Ld(1,1/Math.max(Math.abs(Math.cos(n)),Math.abs(Math.sin(n))),.7),t/10),i=Hh(m,.47),a=.535-Math.max(0,r-.12)*.25,o=Math.sin(n)*r,s=Math.cos(n)*r*.85;return(Math.abs(o)>i.rx*.8||Math.abs(s)>i.rz)&&(a-=(r-.14)*1.1),new V(o,a,s)},pinned:(e,t)=>t===0,memory:e=>.015+.08*(1-e/11)**3,colliders:()=>{let e=[],t=r.localToWorld(new V(0,.02,0)),n=r.localToWorld(new V(0,.36,0));e.push({a:t,b:n,r:.155}),this.jetpack?.visible&&e.push({a:r.localToWorld(new V(0,.12,-.2)),b:r.localToWorld(new V(0,.5,-.2)),r:.11});let i=a[0].shoulder.getWorldPosition(new V),o=a[1].shoulder.getWorldPosition(new V);e.push({a:i,b:o,r:.09});for(let t of a){let n=t.shoulder.getWorldPosition(new V),r=t.elbow.getWorldPosition(new V),i=t.hand.getWorldPosition(new V);e.push({a:n,b:r,r:.075},{a:r,b:i,r:.06})}return e.concat(c())},material:p,uv:(e,t)=>[e/30*2,t/10*1.5],iterations:5});this.cloths.push(h),this.parts.poncho={groups:[],cloth:h};let g=new Dm({cols:7,rows:6,anchor:s,rest:(e,t)=>{let n=t/5,r=1.25*(1-n*.95),i=-r+e/6*r*2,a=.056+n*.03;return new V(Math.sin(i)*a,.02-n*.14,Math.cos(i)*a*.95+n*.03)},pinned:(e,t)=>t===0,memory:()=>.04,colliders:()=>[{a:r.localToWorld(new V(0,.3,0)),b:r.localToWorld(new V(0,.48,0)),r:.1}],material:Ah?new co({color:`#c23a2e`,roughness:.85,side:2,flatShading:!0}):new co({map:Wf(),roughness:.85,side:2}),iterations:3});this.cloths.push(g),this.parts.bandana={groups:[],cloth:g},Mh.on=!1,this.setOutfit(n.outfit||`duster`)}else if(n.dress){let e=new Dm({cols:26,rows:10,wrap:!0,anchor:i,rest:(e,t)=>{let n=e/26*Math.PI*2,r=t/9,i=.16+r*.24,a=.12+r*.24;return new V(Math.sin(n)*i,.06-r*.9,Math.cos(n)*a)},pinned:(e,t)=>t<2,memory:e=>.08*(1-e/10)**2+.01,colliders:c,material:Lh(`linen`,n.dress,.85,3,{side:2}),uv:(e,t)=>[e/26*4,1-t/9*2],iterations:3});this.cloths.push(e),this.parts.dress={groups:[],cloth:e},this.activeCloths=[e]}}setOutfit(e){if(!this.alien)return;this.outfit=e;let t=this.parts.duster,n=this.parts.poncho;for(let n of t.groups)n.visible=e===`duster`;this.activeCloths=[this.parts.bandana.cloth],e===`duster`&&this.activeCloths.push(t.cloth),e===`poncho`&&this.activeCloths.push(n.cloth);for(let e of this.cloths)e.mesh.visible=this.activeCloths.includes(e),e.initialized=!1;this.shirtOnly.visible=e!==`duster`;for(let t of this.shirtBits)t.visible=e!==`duster`}setHat(e){let t=this.face.hatAnchor;if(this.face.hat&&(this.head.remove(this.face.hat),this.face.hat.traverse(e=>e.geometry?.dispose())),!e){this.face.hat=null;return}let n=Qh(e,t.scale);if(n.userData.drifter&&this.face.meshyFace){let e=this.face.meshyFace;n.scale.setScalar(e.scale.x/1.15*1.1),n.position.copy(e.position).addScaledVector(n.userData.drifter.offset,-n.scale.x/1.1),n.position.z-=.022,n.position.y+=.012,n.rotation.set(0,0,0)}else n.position.set(0,t.y,t.z),n.rotation.x=t.rx;this.head.add(n),this.face.hat=n}showHat(e){this.face.hat&&(this.face.hat.visible=e)}setJetpack(e){this.jetpack&&(this.jetpack.visible=e)}nozzleWorld(){return this.jetpack.userData.nozzles.map(e=>this.spine.localToWorld(e.clone()))}setThrust(e){if(!this.jetpack)return;let t=this.jetpack.userData;t.nozzleGlow.emissiveIntensity=.4+e*2.5,t.coreMat.emissiveIntensity=1+e*.8+Math.sin(this.t*20)*.2*e}say(e=1.5){this.talkT=e}holdGun(e){e!==this.gunInHand&&(this.gunInHand=e,e?(this.arms[0].hand.add(this.gun),this.gun.position.set(0,-.06,0),this.gun.rotation.set(Math.PI/2,0,0)):(this.holster.add(this.gun),this.gun.rotation.set(Math.PI/2+.15,0,0),this.gun.position.set(0,0,0)))}solveLeg(e,t,n,r,i){let a=this.P.thigh,o=this.P.shin,s=t-e.base.x,c=n-e.base.y,l=r-e.base.z,u=Math.atan2(s,Math.hypot(c,l)),d=Math.atan2(-l,-c),f=Id(Math.hypot(s,c,l),.12,a+o-5e-4),p=Math.acos(Id((a*a+f*f-o*o)/(2*a*f),-1,1)),m=Math.PI-Math.acos(Id((a*a+o*o-f*f)/(2*a*o),-1,1));e.thigh.rotation.set(d-p,0,u),e.knee.rotation.x=m,e.foot.rotation.x=i-(d-p+m),e.foot.rotation.z=-u}update(e,t){e=Math.min(e,.05),this.t+=e;let n=t.mode||`walk`,r=t.speed||0,i=t.grounded!==!1;this.accel=J(this.accel,(r-this.lastSpeed)/Math.max(e,.001),5,e),this.lastSpeed=r;let a=this.root.rotation.y;this.lastYaw===null&&(this.lastYaw=a),this.yawRate=J(this.yawRate,Rd(a-this.lastYaw)/Math.max(e,.001),6,e),this.lastYaw=a,i&&!this.wasGrounded&&n===`walk`&&(this.land=Id(-this.lastVy/14,.2,1)),this.wasGrounded=i,this.lastVy=t.vy||0,this.land=J(this.land,0,5,e);let o=this.legs,s=this.arms,c=q(3.4,6.5,r),l=q(.1,.9,r),u=0,d=0,f=0,p=.03,m=0,h=[0,0],g={sh:[0,0],shZ:[-.09,.09],shY:[0,0],el:[-.2,-.2],curl:[.4,.4]},_=0,v=0;if(n===`walk`&&i){let n=Ld(.72+.32*r,1+.25*r,c),i=Ld(.6,.32,c);this.cycle=(this.cycle+r/n*e)%1,this.phase=this.cycle*Math.PI*2;let a=i*n,s=Ld(.1,.26,c)*Math.min(1,r/1.5),v=[];for(let e=0;e<2;e++){let t=(this.cycle+e*.5)%1,n,r,l,u;if(t<i){let e=t/i;n=a*(.5-e),l=-.22*(1-q(0,.18,e))*(1-c)+.95*q(.62,1,e),r=Math.max(0,Math.sin(l))*.13,u=1-q(.85,1,e)}else{let e=(t-i)/(1-i);n=a*(-.5+e*e*(3-2*e))+Math.sin(e*Math.PI)*.06*c,r=s*Math.sin(Math.PI*e)**.85+(1-e)*.07,l=Ld(.9,-.22*(1-c),q(0,.75,e)),u=0}v.push({x:o[e].side*Ld(.11,.075,c),y:r,z:n+.02,pitch:l,stance:u})}this.weightT-=e,this.weightT<0&&(this.weightT=5+Math.random()*6,this.weight=-this.weight);let y=this.weight,b=[{x:-.125-.02*y,y:0,z:.05*y,pitch:0,stance:1},{x:.125-.02*y,y:0,z:-.04*y,pitch:0,stance:1}];for(let e=0;e<2;e++){let t=v[e],n=b[e];t.x=Ld(n.x,t.x,l),t.y=Ld(n.y,t.y,l),t.z=Ld(n.z,t.z,l),t.pitch=Ld(0,t.pitch,l),t.stance=Ld(1,t.stance,l)}if(t.ground){this.root.updateWorldMatrix(!0,!1);let e=this.root.position.y;for(let n of v)rg.set(n.x,0,n.z).applyMatrix4(this.root.matrixWorld),n.y+=Id(t.ground(rg.x,rg.z)-e,-.35,.35)}let x=this.P.thigh+this.P.shin-.015,S=this.standY-(1-l)*.01+Math.sin(this.t*1.6)*.004*(1-l);for(let e=0;e<2;e++){let t=v[e];if(t.stance<.3)continue;let n=t.x-o[e].base.x,r=t.z,i=Math.sqrt(Math.max(.01,x*x-n*n-r*r))+this.P.ankle+t.y+.03;S=Math.min(S,Ld(S,i,t.stance))}S-=c*.04+this.land*.2,this.hipY=J(this.hipY,S,18,e),u=(v[0].z-v[1].z)*Ld(.35,.25,c)*l,d=(v[1].stance-v[0].stance)*.045*l*(1-c*.5),f=(v[1].stance-v[0].stance)*.022*l*(1-c)+.012*y*(1-l),d+=-.025*y*(1-l),m=-u*1.5,p=.03+c*.2+Id(this.accel*.025,-.15,.2)+l*.04,h=[v[1].z,v[0].z],this.hips.position.set(f,this.hipY,0),this.hips.rotation.set(0,u,d),this.hips.updateMatrix(),this.body.updateMatrix(),tg.multiplyMatrices(this.body.matrix,this.hips.matrix),ng.copy(tg).invert();for(let e=0;e<2;e++){let t=v[e];rg.set(t.x,t.y+this.P.ankle,t.z).applyMatrix4(ng),this.solveLeg(o[e],rg.x,rg.y,rg.z,t.pitch)}let C=Ld(.9,1.5,c);for(let e=0;e<2;e++){let t=h[e]/Math.max(a*.5,.1)*l;g.sh[e]=-t*C*.42+c*.15,g.el[e]=Ld(-.22-Math.max(0,t)*.35,-1.45-t*.3,c),g.shZ[e]=o[e].side*Ld(.09,.2,c),g.shY[e]=-o[e].side*.15*c,g.curl[e]=Ld(.45,1.05,c)}if(r<.3){let e=Math.sin(this.t*1.5);g.shZ=[-.1-e*.012,.1+e*.012],g.el=[-.18-e*.02,-.25+e*.02]}_=0,this.body.rotation.z=J(this.body.rotation.z,Id(-this.yawRate*r*.018,-.3,.3),6,e)}else if(n===`walk`||n===`hover`||n===`jet`){let r=Id((t.vy||0)/8,-1,1);this.hipY=J(this.hipY,this.standY,8,e),this.hips.position.set(0,this.hipY,0),this.hips.rotation.set(0,0,0),this.body.rotation.z=J(this.body.rotation.z,0,4,e);let i=n===`hover`?Math.sin(this.t*5)*.06:0,a=n===`hover`?.05:.25+r*.1;if(this.solveLeg(o[0],-.12,-this.standY+.12+a+i+this.P.ankle,.16+r*.08,.5),this.solveLeg(o[1],.12,-this.standY+.06+a*.4-i+this.P.ankle,-.12,.7),g.sh=[-.35,.25],g.shZ=[-.65,.65],g.el=[-.5,-.5],g.curl=[.2,.2],n===`hover`&&(g.shZ=[-1+i,1-i],g.el=[-.15,-.15],g.curl=[.05,.05]),p=n===`hover`?.05:-.05+r*-.05,n===`jet`){let n=Id(t.flySpeed/14,0,1),r=Math.sin(this.t*3)*.05;this.solveLeg(o[0],-.1,-this.standY+.05+n*.12+r+this.P.ankle,-.02-n*.2,.9+n*.3),this.solveLeg(o[1],.1,-this.standY+.1+n*.08-r+this.P.ankle,-.08-n*.25,1+n*.3),g.sh=[.25+n*.35,.25+n*.35],g.shZ=[-.35+n*.2,.35-n*.2],g.el=[-.25,-.25],g.curl=[.3,.3],p=.1+n*.35,_=n*.55,this.body.rotation.z=J(this.body.rotation.z,Id(-this.yawRate*.12,-.4,.4),4,e)}}else{this.body.rotation.z=J(this.body.rotation.z,0,4,e);let t=(t,n,r,i,a)=>{t.thigh.rotation.x=J(t.thigh.rotation.x,n,12,e),t.thigh.rotation.z=J(t.thigh.rotation.z,r,12,e),t.knee.rotation.x=J(t.knee.rotation.x,i,12,e),t.foot.rotation.x=J(t.foot.rotation.x,a,12,e),t.foot.rotation.z=0},i=this.standY;if(n===`ride`){let e=Math.sin(this.t*(4+r*.8))*.04*Id(r/8,0,1);i=this.legLen+e;for(let e of o)t(e,-1.25,e.side*.5,1.55,.1);g.sh=[-.75,-.75],g.el=[-1,-1],g.shZ=[-.12,.12],g.curl=[1,1],p=.08+Id(r/16,0,1)*.25}else if(n===`sit`){i=.5;for(let e of o)t(e,-1.5,e.side*.12,1.5,0);g.sh=[-.45,-.45],g.el=[-1.05,-1.05],p=.12}else if(n===`swim`){_=1.25,v=.35,i=.45;for(let e=0;e<2;e++)t(o[e],Math.sin(this.t*6+e*Math.PI)*.35,o[e].side*.1,.35,.8);for(let e=0;e<2;e++)g.sh[e]=-2.2+Math.sin(this.t*2.5+e*Math.PI)*.9,g.el[e]=-.3}this.hipY=J(this.hipY,i,10,e),this.hips.position.set(0,this.hipY,0),this.hips.rotation.set(0,0,0)}this.body.rotation.x=J(this.body.rotation.x,_,6,e),this.body.position.y=J(this.body.position.y,v,6,e);let y=t.action;y===`aim`?(g.sh[0]=-1.5-this.lookPitch,g.shZ[0]=-.04,g.el[0]=-.05,g.shY[0]=0,g.curl[0]=1.1,g.sh[1]=-.35,g.el[1]=-.7):y===`lasso`?(this.lassoSpin+=e*12,g.sh[0]=-2.9,g.shZ[0]=-.35-Math.sin(this.lassoSpin)*.2,g.el[0]=-.3,g.curl[0]=1):y===`throw`?(g.sh[0]=-1.6,g.el[0]=0,g.shZ[0]=0,g.curl[0]=.1):y===`beam`?(g.sh=[-2.3,-2.3],g.shZ=[-.22,.22],g.el=[-.05,-.05],g.curl=[.05,.05]):y===`wave`?(g.sh[0]=-2.8,g.shZ[0]=-.45-Math.sin(this.t*10)*.35,g.el[0]=-.45,g.curl[0]=.05):y===`tip`?(g.sh[0]=-2.55,g.shZ[0]=-.15,g.el[0]=-1.85,g.curl[0]=.8):y===`talk`?(g.sh[0]=-.55+Math.sin(this.t*3)*.18,g.el[0]=-1.05,g.shZ[0]=-.22,g.curl[0]=.2):y===`pickup`&&(p=.7,g.sh=[-1.2,-1.2],g.el=[-.2,-.2]);for(let t=0;t<2;t++){let n=s[t];n.shoulder.rotation.x=J(n.shoulder.rotation.x,g.sh[t],16,e),n.shoulder.rotation.z=J(n.shoulder.rotation.z,g.shZ[t],16,e),n.shoulder.rotation.y=J(n.shoulder.rotation.y,g.shY[t],16,e),n.elbow.rotation.x=J(n.elbow.rotation.x,g.el[t],16,e),n.hand.rotation.x=J(n.hand.rotation.x,y===`aim`&&t===0?0:-.1+g.sh[t]*-.1,16,e);let r=g.curl[t];for(let[t,i]of n.fingers)t.rotation.z=J(t.rotation.z,-n.side*r*.9,12,e),i.rotation.z=J(i.rotation.z,-n.side*r*1.1,12,e)}let b=Math.sin(this.t*1.7);this.spine.rotation.x=J(this.spine.rotation.x,p,8,e),this.spine.rotation.y=J(this.spine.rotation.y,m,10,e),this.spine.rotation.z=J(this.spine.rotation.z,-d*.6,10,e),this.spine.scale.set(1+b*.006,1,1+b*.012);let x=Id(this.lookYaw,-1.1,1.1)-(u+m)*.9;this.neck.rotation.y=J(this.neck.rotation.y,x*.4,8,e),this.head.rotation.y=J(this.head.rotation.y,x*.6,8,e);let S=Id(this.lookPitch*.5,-.5,.5)-p*.75-_*.6;this.neck.rotation.x=J(this.neck.rotation.x,S*.5+.06,8,e),this.head.rotation.x=J(this.head.rotation.x,S*.5-.04,8,e),this.head.rotation.z=J(this.head.rotation.z,-this.body.rotation.z*.8+Math.sin(this.t*.37)*.03,6,e);let C=r*e*3;for(let e of o)e.foot.userData.rowel&&(e.foot.userData.rowel.rotation.z+=C);this.updateFace(e,t),this.updateCloth(e,t)}updateFace(e,t){let n=this.face;this.blinkT-=e;let r=0;this.blinkT<.14&&(r=1-Math.abs(this.blinkT-.07)/.07),this.blinkT<0&&(this.blinkT=Math.random()<.2?.25:2+Math.random()*4);let i=this.alien?-1.7:-.55,a=this.alien?1.05:1.35;for(let e of n.lids)e.rotation.x=Ld(i,a,Id(r,0,1));if(n.meshyEyes)for(let e of n.meshyEyes)e.scale.y=Ld(1,.08,Id(r,0,1));this.gazeT-=e,this.gazeT<0&&(this.gazeT=.6+Math.random()*2.4,this.gaze.set((Math.random()-.5)*.25,(Math.random()-.5)*.14)),this.gazeNow.x=J(this.gazeNow.x,this.gaze.x+this.lookYaw*.15,25,e),this.gazeNow.y=J(this.gazeNow.y,this.gaze.y,25,e);for(let e of n.eyes)e.rotation.y=this.gazeNow.x,e.rotation.x=-this.gazeNow.y;let o=this.talkT>0||t.talking;this.talkT-=e;let s=o?Math.max(0,Math.sin(this.t*13)*.6+Math.sin(this.t*7.3)*.4):0;n.mouth&&(n.mouth.inner.scale.y=J(n.mouth.inner.scale.y,.002+s*(this.alien?.009:.007),20,e),n.mouth.lower.position.y=J(n.mouth.lower.position.y,-s*.008,20,e));let c=o?.004+Math.max(0,Math.sin(this.t*2.1))*.004:.0015*Math.sin(this.t*.5);for(let t of n.brows)t.m.position.y=J(t.m.position.y,t.y0+c,10,e)}updateCloth(e,n){if(this.noCloth){for(let e of this.cloths)e.mesh.parent&&e.mesh.removeFromParent();return}if(!this.activeCloths||!this.activeCloths.length)return;let r=this.root.parent;if(!r)return;let i=t.cameraPos,a=i&&i.distanceToSquared(this.root.position)>t.clothRange*t.clothRange;for(let e of this.activeCloths)e.mesh.parent||r.add(e.mesh),e.mesh.visible=this.root.visible;if(this.root.visible){if(this.root.updateMatrixWorld(!0),a){if(this.farT=(this.farT||0)+e,this.farT<.5)return;this.farT=0;for(let e of this.activeCloths)e.reset(),e.attr.array.set(e.pos),e.attr.needsUpdate=!0,e.mesh.geometry.computeVertexNormals();return}for(let n of this.activeCloths)n.floorY=this.root.position.y+.03,n.step(e,t.wind)}}};ig.cameraPos=null,ig.clothRange=45,ig.wind=new V(.9,0,.5),new V(0,1,0);var ag=new V,og=class{constructor(e){this.game=e,this.rig=eg({species:`alien`,hat:`drifter`}),this.object=this.rig.root,e.scene.add(this.object),this.pos=new V,this.vel=new V,this.yaw=0,this.grounded=!0,this.mode=`walk`,this.stamina=100,this.hover=0,this.hoverMax=0,this.fuel=8,this.jetting=!1,this.jetK=0,this.action=null,this.actionTimer=0,this.mount=null,this.frozen=!1,this.lastStepPhase=0,this.collider={type:`c`,x:0,z:0,r:.35,yMin:-1e9,yMax:1e9,ignore:!0},this.cam={yaw:Math.PI,pitch:.16,dist:5.2,targetDist:5.2,aim:0},this.camTarget=new V,this.camPos=new V,this.aiming=!1,new URLSearchParams(location.search).get(`zeke`)===`new`&&this.loadMeshyModel()}async loadMeshyModel(){let e=await new Am().loadAsync(`/assets-src/zeke.glb`),t=e.scene;t.traverse(e=>{e.isMesh&&(e.castShadow=!0,e.receiveShadow=!0,e.frustumCulled=!1)});let n=new un().setFromObject(t);t.scale.multiplyScalar(1.95/n.getSize(new V).y),this.object.add(t),this.rig.body.visible=!1,this.rig.noCloth=!0;let r=new Us(t),i=t=>e.animations.find(e=>e.name===t),a=bo.subclip(i(`walk_casual`),`idle`,12,13,30),o={idle:r.clipAction(a),walk:r.clipAction(i(`walk`)),run:r.clipAction(i(`run`))};for(let e of Object.values(o))e.play(),e.setEffectiveWeight(0);o.idle.setEffectiveWeight(1),this.meshy={model:t,mixer:r,acts:o}}updateMeshy(e){let t=this.meshy;if(!t)return;let n=this.mount?0:this.speed||0,r=!this.mount&&(this.grounded||this.mode===`swim`),i=(e,t,n)=>{let r=Id((n-e)/(t-e),0,1);return r*r*(3-2*r)},a=i(.15,1.2,n),o=i(4.2,7,n);t.acts.idle.setEffectiveWeight(1-a),t.acts.walk.setEffectiveWeight(a*(1-o)),t.acts.run.setEffectiveWeight(a*o),t.acts.walk.timeScale=Id(n/2.4,.5,1.7),t.acts.run.timeScale=Id(n/7.5,.75,1.4),t.mixer.update(r?e:0)}teleport(e,t,n=this.yaw){this.pos.set(e,X(e,t),t),this.vel.set(0,0,0),this.yaw=n,this.cam.yaw=n+Math.PI,this.camTarget.copy(this.pos).add(new V(0,1.6,0)),this.snapCamera=!0}groundAt(e,t,n){let r=X(e,t),i=this.game.collision.platformHeight(e,t,n);return Math.max(r,i)}get forward(){return new V(-Math.sin(this.cam.yaw),0,-Math.cos(this.cam.yaw))}update(e,t){let n=this.game,r=n.progress.skills;if(t.locked){let e=this.game.settings||{},n=.0023*(e.sensitivity||1);this.cam.yaw-=t.mouse.dx*n,this.cam.pitch=Id(this.cam.pitch+t.mouse.dy*n*(e.invertY?-1:1),-.45,1.25)}if(t.mouse.wheel){let[e,n]=this.mode===`fly`?[12,40]:[2.6,16];this.cam.targetDist=Id(this.cam.targetDist*(1+t.mouse.wheel*.12),e,n)}if(this.mode===`fly`)return this.aiming=!1,this.updateCamera(e);let i=(t.down(`KeyW`)||t.down(`ArrowUp`)?1:0)-(t.down(`KeyS`)||t.down(`ArrowDown`)?1:0),a=(t.down(`KeyD`)||t.down(`ArrowRight`)?1:0)-(t.down(`KeyA`)||t.down(`ArrowLeft`)?1:0),o=this.forward,s=new V(-o.z,0,o.x),c=new V().addScaledVector(o,i).addScaledVector(s,a),l=c.lengthSq()>.01&&!this.frozen;if(l&&c.normalize(),this.aiming=t.mouse.right&&!this.mount&&this.mode!==`swim`&&!this.frozen,this.mount)return this.mount.drive(e,c,l,t,this),this.pos.copy(this.mount.seatPosition()),this.yaw=this.mount.yaw,this.object.position.copy(this.pos),this.object.rotation.set(0,this.yaw,0),this.object.position.y-=this.rig.legLen-.05,this.rig.update(e,{speed:this.mount.speed,grounded:!0,mode:`ride`,action:this.action}),this.collider.ignore=!0,this.updateMeshy(e),this.updateCamera(e);let u=r.spurs||0,d=(t.down(`ShiftLeft`)||t.down(`ShiftRight`))&&l&&this.stamina>1&&this.mode===`walk`&&!this.aiming&&this.grounded,f=this.aiming?2:2.9;d&&(f=8*(1+u*.12)),this.mode===`swim`&&(f=2.8),this.stamina=d?Math.max(0,this.stamina-e*(14-u*3)):Math.min(100,this.stamina+e*20);let p=!this.grounded&&n.progress.flags.jetpack&&t.down(`Space`)&&this.fuel>0;p&&(f=t.down(`ShiftLeft`)||t.down(`ShiftRight`)?22:12);let m=this.grounded||this.mode===`swim`?12:p?2.2:2.5,h=l?c.x*f:p?this.vel.x*.98:0,g=l?c.z*f:p?this.vel.z*.98:0;this.vel.x=J(this.vel.x,h,m,e),this.vel.z=J(this.vel.z,g,m,e),this.aiming?this.yaw=zd(this.yaw,this.cam.yaw+Math.PI,20,e):l&&(this.yaw=zd(this.yaw,Math.atan2(c.x,c.z),12,e)),this.hoverMax=[0,2.2,3.4,5][r.hover||0];let _=this.pos.y;this.groundAt(this.pos.x,this.pos.z,_);let v=Hd-X(this.pos.x,this.pos.z),y=!1,b=!1;if(this.mode===`swim`)this.vel.y=0,this.pos.y=J(this.pos.y,Hd-1.05,8,e),v<1&&(this.mode=`walk`);else{if(this.grounded&&!this.frozen&&t.hit(`Space`))this.vel.y=8.2,this.grounded=!1,n.audio?.jump();else if(!this.grounded&&t.down(`Space`)&&n.progress.flags.jetpack&&this.fuel>0&&!this.frozen){b=!0;let n=t.down(`ShiftLeft`)||t.down(`ShiftRight`),r=t.down(`KeyC`)||t.down(`ControlLeft`)?-2:l?n?2.5:4.5:7;this.vel.y=J(this.vel.y,r,3.5,e),this.fuel=Math.max(0,this.fuel-e*(n?1.6:1))}else!this.grounded&&t.down(`Space`)&&this.hover>0&&this.hoverMax>0&&!this.frozen&&(y=!0,this.vel.y=J(this.vel.y,4.2,5,e),this.hover=Math.max(0,this.hover-e));this.vel.y-=(y||b?0:24)*e,this.vel.y=Math.max(this.vel.y,-40),v>1.2&&this.pos.y<.6-.9&&(this.mode=`swim`,this.vel.y=0,n.audio?.splash(),n.fx?.splash(this.pos))}this.grounded&&(this.hover=Math.min(this.hoverMax,this.hover+e*1.5)),this.fuelMax=8+(r.hover||0)*4,this.grounded?this.fuel=Math.min(this.fuelMax,this.fuel+e*2.5):b||(this.fuel=Math.min(this.fuelMax,this.fuel+e*.3)),this.hovering=y,this.jetting=b,this.jetK=J(this.jetK,+!!b,10,e);let x=this.pos.x+this.vel.x*e,S=this.pos.z+this.vel.z*e;gf(x,S,ag);let C=X(x,S);if(ag.y<.62&&C>this.pos.y+.05&&this.mode!==`swim`){let e=new V(ag.x,0,ag.z).normalize(),t=-(this.vel.x*e.x+this.vel.z*e.z);t>0&&(this.vel.x+=e.x*t,this.vel.z+=e.z*t)}this.pos.x+=this.vel.x*e,this.pos.z+=this.vel.z*e;let w=Math.hypot(this.pos.x,this.pos.z);if(w>660&&(this.pos.x*=660/w,this.pos.z*=660/w),n.collision.resolve(this.pos,.35,this.pos.y,1.8),this.mode!==`swim`){this.pos.y+=this.vel.y*e;let t=this.groundAt(this.pos.x,this.pos.z,this.pos.y);this.pos.y<=t?(!this.grounded&&this.vel.y<-14&&n.audio?.land(),this.pos.y=t,this.vel.y=0,this.grounded=!0):this.grounded&&this.pos.y-t<.45&&this.vel.y<=0?(this.pos.y=t,this.vel.y=0):this.grounded=!1}this.object.position.copy(this.pos),this.object.rotation.set(0,this.yaw,0);let T=Math.hypot(this.vel.x,this.vel.z);this.speed=T,this.actionTimer>0&&(this.actionTimer-=e,this.actionTimer<=0&&(this.action=null));let E=this.aiming?`aim`:this.action;if(this.rig.lookPitch=this.aiming?this.cam.pitch-.2:0,this.rig.update(e,{speed:T,grounded:this.grounded,vy:this.vel.y,mode:this.mode===`swim`?`swim`:b||this.jetK>.3&&!this.grounded?`jet`:y?`hover`:this.sitting?`sit`:`walk`,action:E,flySpeed:T,ground:(e,t)=>this.groundAt(e,t,this.pos.y)}),this.rig.holdGun(this.aiming||this.action===`aim`),this.grounded&&T>.5&&this.mode===`walk`){let e=Math.floor(this.rig.phase/Math.PI);e!==this.lastStepPhase&&(this.lastStepPhase=e,n.audio?.step(T>6,this.pos),n.fx?.dust(this.pos,T))}if(this.mode===`swim`&&T>.5&&Math.random()<e*4&&n.fx?.splash(this.pos,.4),y&&Math.random()<e*30&&n.fx?.hoverGlow(this.pos),this.rig.setThrust(this.jetK),this.jetK>.05){for(let e of this.rig.nozzleWorld())n.fx?.jetFlame(e,this.vel,this.jetK);let t=X(this.pos.x,this.pos.z);this.pos.y-t<4&&Math.random()<e*25*this.jetK&&n.fx?.dust(new V(this.pos.x,t,this.pos.z),12)}n.audio?.jetpack(this.jetK),this.collider.x=this.pos.x,this.collider.z=this.pos.z,this.updateMeshy(e),this.updateCamera(e)}startAction(e,t){this.action=e,this.actionTimer=t}updateCamera(e){let t=this.cam,n=this.game,r=this.mode===`fly`,i=r?n.saucerCtl.pos:this.pos;t.dist=J(t.dist,t.targetDist,6,e),t.aim=J(t.aim,+!!this.aiming,12,e);let a=r?n.saucerCtl.vel.length():this.mount?this.mount.speed:Math.hypot(this.vel.x,this.vel.z);if(this.mouseIdle=(this.mouseIdle||0)+e,(this.game.input.mouse.dx||this.game.input.mouse.dy)&&(this.mouseIdle=0),this.mouseIdle>1.4&&a>1.5&&!this.aiming&&!this.frozen){let i=(r?n.saucerCtl.yaw:this.mount?this.mount.yaw:Math.atan2(this.vel.x,this.vel.z))+Math.PI,o=Math.min(1,(this.mouseIdle-1.4)/1.5)*Id(a/8,.3,1)*1.3;t.yaw=zd(t.yaw,i,o,e)}let o=-Math.sin(t.yaw),s=-Math.cos(t.yaw),c=(X(i.x+o*6,i.z+s*6)-X(i.x,i.z))/6;this.pitchBias=J(this.pitchBias||0,r||this.jetK>.2?.12:Id(-c*.6,-.25,.2),2,e);let l=Id(t.pitch+this.pitchBias,-.4,1.3),u=r?1.5:this.mount?2.5:1.45,d=new V(this.vel.x,0,this.vel.z).multiplyScalar(r?.25:.12);d.length()>2.2&&d.setLength(2.2);let f=new V(i.x,i.y+u,i.z).add(d);this.snapCamera&&=(this.camTarget.copy(f),this.camVel=new V,!1),this.camTarget.x=J(this.camTarget.x,f.x,7,e),this.camTarget.z=J(this.camTarget.z,f.z,7,e),this.camTarget.y=J(this.camTarget.y,f.y,this.grounded?6:3,e);let p=Id(a/9,0,1),m=t.dist*(this.mount?1.3:1)*(1+p*.18+this.jetK*.4);m=Ld(m,2.2,t.aim);let h=Ld(.55*Id(t.dist/6,.5,1.2),.75,t.aim)*+!r,g=new V(Math.cos(t.yaw),0,-Math.sin(t.yaw)),_=new V(Math.sin(t.yaw)*Math.cos(l),Math.sin(l),Math.cos(t.yaw)*Math.cos(l)).multiplyScalar(m),v=_.clone().normalize(),y=m;for(let e=.6;e<m;e+=.35){let t=this.camTarget.clone().addScaledVector(v,e);if(n.collision.blocksCamera(t.x,t.y,t.z)){y=Math.max(.9,e-.4);break}}this.camBlock=y<(this.camBlock??m)?y:J(this.camBlock??m,y,3,e),_.setLength(Math.min(m,this.camBlock));let b=this.camTarget.clone().add(_).addScaledVector(g,h);b.y+=.12*t.aim;let x=-1/0;for(let[e,t]of[[0,0],[.8,0],[-.8,0],[0,.8],[0,-.8]])x=Math.max(x,X(b.x+e,b.z+t));x+=.6,b.y<x&&(b.y=x);let S=performance.now()/1e3,C=(1-p)*(1-t.aim)*.03;b.x+=Math.sin(S*.31)*C,b.y+=Math.sin(S*.43)*C*.6,this.grounded&&!this.wasGroundedCam&&(this.lastVy||0)<-9&&(this.camShake=Math.min(.35,-this.lastVy*.02)),this.wasGroundedCam=this.grounded,this.lastVy=this.vel.y,this.camShake=Math.max(0,(this.camShake||0)-e*1.5),b.y-=this.camShake*this.camShake*1.5;let w=n.camera;w.position.copy(b);let T=this.camTarget.clone().addScaledVector(g,h*.92);T.y+=.25*(1-t.aim)-Math.min(.3,l*.2),w.lookAt(T);let E=(t.yaw-(this.lastCamYaw??t.yaw)+Math.PI*3)%(Math.PI*2)-Math.PI;this.lastCamYaw=t.yaw,this.camRoll=J(this.camRoll||0,Id(-E/Math.max(e,.001)*.01*p,-.04,.04),4,e),w.rotateZ(this.camRoll);let D=58+p*6+this.jetK*6+(this.mount&&this.mount.speed>12?4:0);w.fov=J(w.fov,D-t.aim*12,4,e),w.updateProjectionMatrix()}},sg=class{constructor(e,t){this.game=e,this.def=t,this.id=t.id,this.name=t.name,this.rig=eg(t.look),this.object=this.rig.root,this.pos=t.pos.clone(),this.homeYaw=t.yaw||0,this.yaw=this.homeYaw,this.object.position.copy(this.pos),e.scene.add(this.object),this.talking=!1,this.waveT=0,this.path=t.wander||null,this.pathI=0,this.speed=0,this.pauseT=0,this.collider={type:`c`,x:this.pos.x,z:this.pos.z,r:.4,yMin:-1e9,yMax:1e9},e.collision.dynamic.add(this.collider),this.greeted=!1}update(e){let t=this.game.player.pos,n=this.pos.distanceTo(t),r=this.talking?`talk`:null;n<7&&!this.greeted&&!this.def.noWave&&(this.greeted=!0,this.waveT=1.6),n>25&&(this.greeted=!1),this.waveT>0&&(this.waveT-=e,r=`wave`);let i=!1;if(this.path&&!this.talking&&n>3){if(this.pauseT>0)this.pauseT-=e;else{let t=this.path[this.pathI],n=t.x-this.pos.x,r=t.z-this.pos.z;Math.hypot(n,r)<.4?(this.pathI=(this.pathI+1)%this.path.length,this.pauseT=2+Math.random()*5):(this.yaw=zd(this.yaw,Math.atan2(n,r),5,e),this.speed=J(this.speed,1.3,4,e),this.pos.x+=Math.sin(this.yaw)*this.speed*e,this.pos.z+=Math.cos(this.yaw)*this.speed*e,this.pos.y=Math.max(X(this.pos.x,this.pos.z),this.game.collision.platformHeight(this.pos.x,this.pos.z,this.pos.y)),i=!0)}}i||(this.speed=J(this.speed,0,6,e));let a=n<6||this.talking,o=Math.atan2(t.x-this.pos.x,t.z-this.pos.z);a&&!i?this.yaw=zd(this.yaw,o,4,e):!i&&!this.path&&(this.yaw=zd(this.yaw,this.homeYaw,2,e)),this.rig.lookYaw=a?Math.max(-1,Math.min(1,(o-this.yaw+Math.PI*3)%(Math.PI*2)-Math.PI)):0,this.object.position.copy(this.pos),this.object.rotation.y=this.yaw,this.collider.x=this.pos.x,this.collider.z=this.pos.z,this.rig.update(e,{speed:this.speed,grounded:!0,mode:this.def.pose===`sit`?`sit`:`walk`,action:r,talking:this.talking&&this.game.ui.dialogState?.typing,ground:X})}headPos(){return this.pos.clone().add(new V(0,2.25,0))}};function cg(e,t,n=0,r=0,i=0){let a=new G(e,t);return a.position.set(n,r,i),a.castShadow=!0,a.receiveShadow=!0,a}var lg,ug={horse:()=>({bodyLen:1.25,bodyR:.36,legLen:1,legR:.07,neckLen:.75,neckAngle:.75,headLen:.5,headR:.13,color:`#7a4a2a`,legColor:`#3a2418`,hoof:`#2a2420`,mane:`#221610`,tail:`horse`,ears:`pointy`,blaze:!0}),cow:()=>(lg||=zf(),{bodyLen:1.2,bodyR:.42,legLen:.72,legR:.075,neckLen:.35,neckAngle:.25,headLen:.42,headR:.15,color:`#ffffff`,map:lg,legColor:`#efe8dc`,hoof:`#2a2420`,tail:`cow`,ears:`floppy`,horns:!0,udder:!0}),dog:()=>({bodyLen:.45,bodyR:.16,legLen:.32,legR:.04,neckLen:.18,neckAngle:.9,headLen:.2,headR:.09,color:`#b58a58`,legColor:`#caa274`,hoof:`#caa274`,tail:`dog`,ears:`dog`,snout:`#f0e0c8`})};function dg(e,t={}){let n={...ug[e](),...t},r=new co({color:n.color,map:n.map||null,roughness:.75}),i=new co({color:n.legColor,roughness:.8}),a=new co({color:n.hoof,roughness:.6}),o=new co({color:n.mane||n.color,roughness:.9}),s=new H,c=new H,l=n.legLen+n.bodyR*.55;c.position.y=l,s.add(c);let u=cg(new vi(n.bodyR,n.bodyLen,6,14),r);u.rotation.x=Math.PI/2,u.scale.set(.85,1,1),c.add(u),e===`horse`&&(c.add(cg(new Ja(n.bodyR*1.05,14,10),r,0,.05,-n.bodyLen*.45)),c.add(cg(new Ja(n.bodyR*1,14,10),r,0,.02,n.bodyLen*.45))),n.udder&&c.add(cg(new Ja(.13,10,8),new co({color:`#f0b6b0`,roughness:.6}),0,-n.bodyR*.85,-n.bodyLen*.3));let d=new H;d.position.set(0,n.bodyR*.35,n.bodyLen/2+n.bodyR*.3),d.rotation.x=-n.neckAngle,c.add(d);let f=cg(new vi(n.headR*1.25,n.neckLen,4,10),r,0,0,0);f.rotation.x=Math.PI/2,f.position.z=n.neckLen/2,f.scale.set(.8,1,1.25),d.add(f);let p=new H;p.position.z=n.neckLen+n.headR*.5,p.rotation.x=n.neckAngle+.55,d.add(p);let m=cg(new vi(n.headR,n.headLen,4,10),r,0,0,n.headLen/2);m.rotation.x=Math.PI/2,m.scale.set(.85,1,1.05),p.add(m);let h=cg(new Ja(n.headR*.95,10,8),new co({color:n.snout||(e===`cow`?`#e7b7aa`:`#3a2a22`),roughness:.6}),0,-.02,n.headLen+n.headR*.3);if(h.scale.set(.95,.85,.9),p.add(h),e===`dog`){let e=cg(new Ja(.025,8,6),new co({color:`#1a1410`,roughness:.3}),0,.02,n.headLen+n.headR*1.1);p.add(e)}if(n.blaze){let e=cg(new Wa(.07,n.headLen*.9),new co({color:`#f2ece2`}),0,n.headR*.87,n.headLen*.5);e.rotation.x=-Math.PI/2,p.add(e)}let g=new co({color:`#0e0a08`,roughness:.2});for(let e of[-1,1]){p.add(cg(new Ja(n.headR*.18,8,6),g,e*n.headR*.78,n.headR*.35,n.headLen*.3));let t;if(n.ears===`pointy`?(t=cg(new xi(.045,.16,5),r,e*.07,n.headR+.05,-.02),t.rotation.z=-e*.2):n.ears===`floppy`?(t=cg(new Ja(.06,8,6),r,e*(n.headR+.06),n.headR*.4,.02),t.scale.set(1.6,.5,.9)):(t=cg(new Ja(.05,8,6),new co({color:`#7a5a3a`}),e*.065,n.headR*.7,-.01),t.scale.set(.6,1.3,.5),t.rotation.z=e*.5),p.add(t),n.horns){let t=cg(new xi(.025,.14,6),new co({color:`#e8dcc0`}),e*.1,n.headR+.03,.02);t.rotation.z=-e*.9,p.add(t)}}if(n.mane){for(let e=0;e<7;e++){let t=cg(new _i(.05,.14,.12),o,0,n.headR*1.1,e*n.neckLen/7+.05);t.rotation.x=-.2,d.add(t)}p.add(cg(new _i(.05,.08,.14),o,0,n.headR+.04,.02))}let _=new H;if(_.position.set(0,n.bodyR*.4,-n.bodyLen/2-n.bodyR*.8),c.add(_),n.tail===`horse`){let e=cg(new xi(.1,.8,7),o,0,-.4,-.05);e.rotation.x=Math.PI+.15,_.add(e),_.rotation.x=.35}else if(n.tail===`cow`){let e=cg(new bi(.015,.015,.7,5),r,0,-.35,0);_.add(e),_.add(cg(new Ja(.05,6,5),new co({color:`#1e1a18`}),0,-.72,0)),_.rotation.x=.1}else{let e=cg(new vi(.03,.2,3,6),r,0,.12,0);_.add(e),_.rotation.x=-.7}let v=[],y=n.bodyR*.55,b=n.bodyLen/2;for(let[t,o]of[[-1,1],[1,1],[-1,-1],[1,-1]]){let c=new H;c.position.set(t*y,l-n.bodyR*.3,o*b),s.add(c);let u=(n.legLen-n.bodyR*.3)*.5,d=cg(new vi(n.legR*1.35,u,3,8),o>0?i:r,0,-u/2,0);e!==`cow`&&(d.material=r),c.add(d);let f=new H;f.position.y=-u-n.legR*.2,c.add(f);let p=n.legLen-n.bodyR*.3-u-n.legR*1.5;f.add(cg(new vi(n.legR,p,3,8),i,0,-p/2,0));let m=cg(new bi(n.legR*1.1,n.legR*1.3,n.legR*1.6,8),a,0,-p-n.legR*.4,0);f.add(m),v.push({hip:c,knee:f,front:o>0,side:t})}let x=null;if(e===`horse`){x=new H;let e=new co({color:`#5a3a22`,roughness:.55}),t=cg(new bi(n.bodyR*1.02,n.bodyR*1.02,.55,14,1,!0,-1.2,2.4),e);t.rotation.z=Math.PI/2,t.rotation.y=Math.PI/2,t.rotation.set(Math.PI/2,0,0),t.rotation.set(0,0,0);let r=cg(new _i(n.bodyR*2.1,.06,.6),new co({color:`#8a2a22`,roughness:.9}),0,n.bodyR*.88,.05),i=cg(new _i(n.bodyR*1.3,.1,.5),e,0,n.bodyR*.96,.05),a=cg(new bi(.03,.04,.14,8),e,0,n.bodyR*1.05,.3),o=cg(new _i(n.bodyR*1.2,.14,.06),e,0,n.bodyR*1.03,-.2);x.add(r,i,a,o);for(let t of[-1,1]){let r=cg(new _i(.02,.6,.04),e,t*n.bodyR*.95,n.bodyR*.5,.05),i=cg(new Ya(.06,.012,4,8),new co({color:`#888`,metalness:.8,roughness:.3}),t*n.bodyR*1,n.bodyR*.05-.2,.05);x.add(r,i)}x.visible=!1,c.add(x)}return new pg({root:s,body:c,neck:d,head:p,tail:_,legs:v,saddle:x,o:n,kind:e,bodyY:l})}var fg={walk:[0,.5,.75,.25],trot:[0,.5,.5,0],gallop:[0,.12,.55,.65]},pg=class{constructor(e){Object.assign(this,e),this.phase=Math.random()*10,this.t=Math.random()*10,this.headDown=0,this.buck=0,this.sit=0}get saddleHeight(){return this.bodyY+this.o.bodyR*1}update(e,{speed:t=0,graze:n=!1,sit:r=!1,wag:i=0}={}){this.t+=e;let a=this.o,o=a.legLen*1.6,s=t>9?`gallop`:t>4?`trot`:`walk`,c=fg[s];this.phase+=t/o*e*Math.PI*(s===`gallop`?.9:1.1);let l=Id(t/3,0,1)*(s===`gallop`?.75:.5);this.sit=J(this.sit,+!!r,5,e),this.legs.forEach((t,n)=>{let r=this.phase+c[n]*Math.PI*2,i=Math.sin(r)*l,a=Math.max(0,Math.cos(r))*l*1.4;t.front||(i+=this.sit*1.1,a+=this.sit*2),t.hip.rotation.x=J(t.hip.rotation.x,-i,18,e),t.knee.rotation.x=J(t.knee.rotation.x,a,18,e)});let u=s===`gallop`?Math.sin(this.phase*2)*.08*l:Math.abs(Math.sin(this.phase*2))*.03*l;this.body.position.y=this.bodyY+u-this.sit*a.legLen*.25,this.body.rotation.x=-this.sit*.45+(s===`gallop`?Math.sin(this.phase*2)*.06*l:0),this.buck>0?(this.body.rotation.x+=Math.sin(this.t*9)*.35*this.buck,this.body.rotation.z=Math.sin(this.t*5.3)*.15*this.buck,this.body.position.y+=Math.abs(Math.sin(this.t*9))*.35*this.buck):this.body.rotation.z=J(this.body.rotation.z,0,5,e),this.headDown=J(this.headDown,+!!n,2.5,e),this.neck.rotation.x=-a.neckAngle+this.headDown*(a.neckAngle+.9)+Math.sin(this.t*1.3)*.04+(s===`gallop`?Math.sin(this.phase*2)*.1:0)+this.sit*.3,this.neck.rotation.y=Math.sin(this.t*.4)*.15*(1-this.headDown),a.tail===`dog`?this.tail.rotation.z=Math.sin(this.t*(8+i*12))*(.25+i*.5):this.tail.rotation.z=Math.sin(this.t*1.7)*.2}},mg=new V,hg=class{constructor(e,t,n,r,i){this.game=e,this.rig=dg(t,i),this.object=this.rig.root,e.scene.add(this.object),this.pos=new V(n,X(n,r),r),this.yaw=Math.random()*Math.PI*2,this.speed=0,this.vy=0,this.collider={type:`c`,x:n,z:r,r:.7,yMin:-1e9,yMax:1e9},e.collision.dynamic.add(this.collider)}moveToward(e,t,n,r,i=3,a=.5){let o=t-this.pos.x,s=n-this.pos.z,c=Math.hypot(o,s),l=c>a?Math.min(r,(c-a)*1.5):0;return this.speed=J(this.speed,l,i,e),c>.1&&l>.05&&(this.yaw=zd(this.yaw,Math.atan2(o,s),4,e)),this.advance(e),c}advance(e){let t=this.pos.x+Math.sin(this.yaw)*this.speed*e,n=this.pos.z+Math.cos(this.yaw)*this.speed*e;if(X(t,n)<0&&X(t,n)<=X(this.pos.x,this.pos.z)){if(X(this.pos.x,this.pos.z)<0)this.yaw+=.7;else{this.speed=0;return}return}if(gf(t,n,mg),mg.y<.7){this.speed*=.5,this.yaw+=.1;return}this.pos.x=t,this.pos.z=n,this.collider.ignore=!0,this.game.collision.resolve(this.pos,this.collider.r,this.pos.y,1.5),this.collider.ignore=!1}sync(e,t={}){let n=X(this.pos.x,this.pos.z);this.airborne||(this.pos.y=J(this.pos.y,n,20,e)),this.collider.x=this.pos.x,this.collider.z=this.pos.z,this.object.position.copy(this.pos),this.object.rotation.y=this.yaw,this.rig.update(e,{speed:this.speed,...t})}},gg=class extends hg{constructor(e,t,n,{stray:r=!1,name:i=`Cow`}={}){super(e,`cow`,t,n),this.home=new V(t,0,n),this.stray=r,this.name=i,this.state=`graze`,this.timer=Math.random()*5,this.target=new V(t,0,n),this.leashedTo=null,this.mooT=5+Math.random()*20,this.penned=!1}update(e){let t=this.game;if(this.mooT-=e,this.mooT<0&&(this.mooT=15+Math.random()*30,this.pos.distanceTo(t.player.pos)<30&&t.audio?.moo(this.pos)),this.state===`beamed`){this.speed=0,this.object.position.copy(this.pos),this.object.rotation.y=this.yaw,this.object.rotation.z=Math.sin(performance.now()*.004)*.3,this.rig.update(e,{speed:3}),this.collider.x=this.pos.x,this.collider.z=this.pos.z;return}if(this.object.rotation.z=J(this.object.rotation.z,0,5,e),this.airborne){this.vy-=22*e,this.pos.y+=this.vy*e;let n=X(this.pos.x,this.pos.z);this.pos.y<=n&&(this.pos.y=n,this.airborne=!1,this.vy=0,t.audio?.moo(this.pos,1.3),t.fx?.dust(this.pos,12),this.state=`wander`,this.target.copy(this.home),this.timer=30),this.sync(e);return}let n=!1;if(this.leashedTo){let t=this.leashedTo;this.moveToward(e,t.x,t.z,9,4,2.6)}else if(this.state===`graze`){if(n=!0,this.speed=J(this.speed,0,3,e),this.timer-=e,this.timer<0){this.state=`wander`;let e=this.penned?4:14,n=this.penned?t.world.anchors.pen:null;n?this.target.set((n.x0+n.x1)/2+(Math.random()-.5)*12,0,(n.z0+n.z1)/2+(Math.random()-.5)*9):this.target.set(this.home.x+(Math.random()-.5)*e*2,0,this.home.z+(Math.random()-.5)*e*2),this.timer=12}}else if(this.state===`wander`){let t=this.moveToward(e,this.target.x,this.target.z,1.1,2,.6);this.timer-=e,(t<.8||this.timer<0)&&(this.state=`graze`,this.timer=4+Math.random()*8)}this.sync(e,{graze:n})}},_g=class extends hg{constructor(e,t,n){super(e,`horse`,t,n),this.collider.r=.8,this.tamed=!1,this.corral=new V(t,0,n),this.state=`roam`,this.timer=0,this.target=new V(t,0,n),this.rider=null,this.called=!1,this.name=`Stardust`}seatPosition(){let e=-.1;return new V(this.pos.x+Math.sin(this.yaw)*e,this.object.position.y+this.rig.body.position.y+this.rig.o.bodyR*.95,this.pos.z+Math.cos(this.yaw)*e)}setTamed(e){this.tamed=e,this.rig.saddle.visible=e}drive(e,t,n,r,i){let a=this.game.progress.skills.riding||1,o=r.down(`ShiftLeft`)||r.down(`ShiftRight`),s=n?o?15+a*2:7:0;if(this.speed=J(this.speed,s,n?1.8:3,e),n){let n=Rd(Math.atan2(t.x,t.z)-this.yaw);this.yaw+=Id(n,-2.6*e,2.6*e)}this.grounded!==!1&&r.hit(`Space`)&&!this.airborne&&(this.airborne=!0,this.vy=7.5,this.game.audio?.jump());let c=this.pos.x+Math.sin(this.yaw)*this.speed*e,l=this.pos.z+Math.cos(this.yaw)*this.speed*e;gf(c,l,mg),X(c,l)<-.6||mg.y<.65&&X(c,l)>this.pos.y?this.speed*=.3:(this.pos.x=c,this.pos.z=l),this.collider.ignore=!0,this.game.collision.resolve(this.pos,.8,this.pos.y,2.2);let u=Math.hypot(this.pos.x,this.pos.z);if(u>660&&(this.pos.x*=660/u,this.pos.z*=660/u),this.airborne){this.vy-=22*e,this.pos.y+=this.vy*e;let t=X(this.pos.x,this.pos.z);this.pos.y<=t&&(this.pos.y=t,this.airborne=!1)}else this.pos.y=X(this.pos.x,this.pos.z);this.collider.x=this.pos.x,this.collider.z=this.pos.z,this.object.position.copy(this.pos),this.object.rotation.y=this.yaw,this.rig.update(e,{speed:this.airborne?10:this.speed}),this.speed>3&&Math.floor(this.rig.phase/Math.PI)!==this.lastStep&&(this.lastStep=Math.floor(this.rig.phase/Math.PI),this.game.audio?.hoof(this.speed),this.game.fx?.dust(this.pos,this.speed))}update(e){if(this.rider)return;this.collider.ignore=!1;let t=this.game;if(this.state===`buck`){this.speed=0,this.rig.buck=1,this.sync(e);return}if(this.rig.buck=J(this.rig.buck,0,4,e),this.called){let n=t.player.pos;this.moveToward(e,n.x,n.z,14,2,3)<3.5&&(this.called=!1),this.sync(e);return}let n=!1;if(this.timer-=e,this.state===`roam`)(this.moveToward(e,this.target.x,this.target.z,this.tamed?1.5:3.5,2,.5)<1||this.timer<0)&&(this.state=`idle`,this.timer=3+Math.random()*6);else if(n=!0,this.speed=J(this.speed,0,3,e),this.timer<0){this.state=`roam`,this.timer=10;let e=this.tamed?this.pos:this.corral,t=this.tamed?4:6;this.target.set(e.x+(Math.random()-.5)*t*2,0,e.z+(Math.random()-.5)*t*2)}this.sync(e,{graze:n})}},vg=class extends hg{constructor(e,t,n){super(e,`dog`,t,n),this.collider.r=.3,this.collider.ignore=!0,this.name=`Biscuit`,this.barkT=8,this.joined=!1,this.idleT=0}update(e){let t=this.game,n=t.player.mode===`fly`?null:t.player.pos,r=!0,i=0;if(this.joined&&n){let a=new V(Math.sin(t.player.yaw+2.4),0,Math.cos(t.player.yaw+2.4)).multiplyScalar(t.player.mount?3.5:2),o=n.x+a.x,s=n.z+a.z,c=Math.hypot(o-this.pos.x,s-this.pos.z);if(c>70&&this.pos.set(o,X(o,s),s),c>1.2||this.speed>.3){let t=c>8?14:c>3?7:3;this.moveToward(e,o,s,t,5,.6),r=this.speed<.2}else{this.speed=J(this.speed,0,5,e);let t=Math.atan2(n.x-this.pos.x,n.z-this.pos.z);this.yaw=zd(this.yaw,t,3,e)}i=c<4?1:.3,this.barkT-=e,this.barkT<0&&(this.barkT=20+Math.random()*40,t.audio?.bark(this.pos))}else this.speed=0,r=!0;this.speed<.2?this.idleT+=e:this.idleT=0,this.sync(e,{sit:r&&this.speed<.3,wag:i})}},yg=class{constructor(e,t=7){this.game=e;let n=Bd(77),r=[];for(let e=0;e<70;e++){let e=new bi(.015,.015,.5+n()*.5,3);e.rotateX(n()*Math.PI),e.rotateZ(n()*Math.PI),e.translate((n()-.5)*.5,(n()-.5)*.5,(n()-.5)*.5);for(let t of Object.keys(e.attributes))t!==`position`&&t!==`normal`&&e.deleteAttribute(t);r.push(e.toNonIndexed())}let i=kf(r),a=new co({color:`#a88a5c`,roughness:1});this.items=[];for(let r=0;r<t;r++){let t=new G(i,a);t.castShadow=!0,t.scale.setScalar(.9+n()*.8),e.scene.add(t),this.items.push({m:t,pos:new V,vel:new V,vy:0,alive:!1})}this.wind=new V(.85,0,.5).normalize()}respawn(e){let t=this.game.player.pos,n=(Math.random()-.5)*100,r=t.x-this.wind.x*(60+Math.random()*40)-this.wind.z*n,i=t.z-this.wind.z*(60+Math.random()*40)+this.wind.x*n;e.pos.set(r,X(r,i)+.5,i),e.vel.copy(this.wind).multiplyScalar(3+Math.random()*3),e.alive=!0}update(e){let t=this.game.player.pos;for(let n of this.items){(!n.alive||n.pos.distanceTo(t)>140)&&this.respawn(n);let r=1+Math.sin(performance.now()*7e-4+n.m.scale.x*10)*.5;n.vel.x=J(n.vel.x,this.wind.x*5*r,.8,e),n.vel.z=J(n.vel.z,this.wind.z*5*r,.8,e),n.vy-=18*e,n.pos.addScaledVector(n.vel,e),n.pos.y+=n.vy*e;let i=.4*n.m.scale.x,a=X(n.pos.x,n.pos.z)+i;n.pos.y<a&&(n.pos.y=a,n.vy=Math.random()*4+1),X(n.pos.x,n.pos.z)<.6&&(n.alive=!1),n.m.position.copy(n.pos),Math.hypot(n.vel.x,n.vel.z),n.m.rotation.x+=n.vel.z/i*e*.5,n.m.rotation.z-=n.vel.x/i*e*.5}}},bg=[{id:`lasso`,tree:`Cowboy`,name:`Lasso`,max:3,ranks:[`Rope a cow within 11 m`,`Throw range 17 m`,`Throw range 24 m and the rope never slips`],locked:`Ma McCready can teach you`},{id:`riding`,tree:`Cowboy`,name:`Horsemanship`,max:3,ranks:[`Ride a tamed horse`,`Gallop faster`,`Gallop like the wind`],locked:`Tame a horse first`},{id:`quickdraw`,tree:`Cowboy`,name:`Quick Draw`,max:3,ranks:[`Time slows a little while aiming`,`Time slows more, +3 s at the range`,`Deadeye: time nearly stops`]},{id:`spurs`,tree:`Cowboy`,name:`Trail Legs`,max:3,ranks:[`Sprint 12% faster`,`Sprint 24% faster, tire slower`,`Sprint 36% faster, barely tire`]},{id:`hover`,tree:`Alien`,name:`Hover Jets`,max:3,ranks:[`Float mid-air for 2 s; jetpack fuel +50%`,`Float 3.5 s; jetpack fuel +100%`,`Float 5 s; jetpack fuel +150%`]},{id:`beam`,tree:`Alien`,name:`Tractor Beam`,max:3,ranks:[`Hold Q to lift cows and tumbleweeds within 10 m`,`Range 16 m, lift faster`,`Range 24 m`]},{id:`xenosight`,tree:`Alien`,name:`Xeno-Sight`,max:2,ranks:[`Nearby gold and ship parts show on your compass`,`Doubles the sensing range`]}],xg={lasso:0,riding:0,quickdraw:0,spurs:0,hover:0,beam:0,xenosight:0},Sg=class{constructor(e){this.game=e,this.reset()}reset(){this.xp=0,this.level=1,this.sp=1,this.money=0,this.skills={...xg},this.hats=[],this.hat=`drifter`,this.hasHat=!1,this.outfit=`duster`,this.outfits=[`duster`,`shirt`],this.nuggets=0,this.parts=[],this.collected=[],this.discovered=[],this.flags={},this.stats={abducted:0,cans:0,cowsPenned:0,distance:0}}xpFor(e){return Math.round(100*e**1.45)}addXP(e,t){this.xp+=e,this.game.ui?.toast(`+${e} XP`,t,`xp`);let n=!1;for(;this.xp>=this.xpFor(this.level);)this.xp-=this.xpFor(this.level),this.level+=1,this.sp+=1,n=!0;n&&(this.game.ui?.levelUp(this.level),this.game.audio?.levelUp()),this.game.ui?.refresh()}addMoney(e,t){this.money+=e,this.game.ui?.toast(`${e>0?`+`:``}$${e}`,t,`money`),this.game.ui?.refresh()}grantSkill(e,t=1){if(this.skills[e]>=t)return;this.skills[e]=t;let n=bg.find(t=>t.id===e);this.game.ui?.toast(`New skill`,`${n.name}: ${n.ranks[t-1]}`,`skill`),this.game.audio?.chime(),this.game.ui?.refresh()}canUpgrade(e){let t=bg.find(t=>t.id===e),n=this.skills[e];return!(this.sp<1||n>=t.max||n===0&&(e===`lasso`||e===`riding`))}upgrade(e){if(!this.canUpgrade(e))return!1;--this.sp,this.skills[e]+=1;let t=bg.find(t=>t.id===e);return this.game.ui?.toast(`${t.name} ${`I`.repeat(this.skills[e])}`,t.ranks[this.skills[e]-1],`skill`),this.game.audio?.chime(),this.game.ui?.refresh(),!0}toJSON(){let{game:e,...t}=this;return t}load(e){Object.assign(this,e),this.skills={...xg,...e.skills}}},Cg={crash:{title:`Crash Landing`,main:!0,stages:[{text:`Grab the hat off that knocked-over scarecrow`,target:e=>e.world.anchors.hatSpot,check:e=>e.progress.hasHat},{text:`Salvage the emergency jetpack from your wreck`,target:e=>e.saucerCtl.pos,on:{jetpack:()=>!0},check:e=>e.progress.flags.jetpack},{text:`Say hello to the dog sleeping by the campfire`,target:e=>e.dog.pos,check:e=>e.dog.joined},{text:`Follow the dirt road to find civilization`,target:()=>wg(Y.town.x+40,Y.town.z+6),check:e=>e.progress.discovered.includes(`town`)}],reward:{xp:60},next:[`howdy`]},howdy:{title:`Howdy, Stranger`,main:!0,stages:[{text:`Introduce yourself to Sheriff Dawson`,target:e=>e.npcs.sheriff.pos,on:{talked:e=>e===`sheriff`}},{text:`Meet Miss Clementine outside the saloon`,target:e=>e.npcs.clementine.pos,on:{talked:e=>e===`clementine`}}],reward:{xp:80},next:[`ropes`,`phonehome`,`quickdraw`]},ropes:{title:`Learn the Ropes`,stages:[{text:`Visit Ma McCready at the ranch east of town`,target:e=>e.npcs.ma.pos,on:{talked:e=>e===`ma`}},{text:e=>`Lasso the stray cows [F] and lead them into the pen (${e.cows.filter(e=>e.stray&&e.penned).length}/3)`,target:e=>{let t=e.cows.filter(e=>e.stray&&!e.penned).sort((t,n)=>t.pos.distanceTo(e.player.pos)-n.pos.distanceTo(e.player.pos))[0];return t?t.leashedTo||t.state===`beamed`?e.world.anchors.pen.gate:t.pos:null},check:e=>e.cows.filter(e=>e.stray&&e.penned).length>=3},{text:`Tell Ma McCready her girls are home`,target:e=>e.npcs.ma.pos,on:{talked:e=>e===`ma`}}],reward:{xp:150,money:40},next:[`mustang`]},mustang:{title:`Wild Stallion`,stages:[{text:`Tame the wild mustang in the corral (walk up and press E)`,target:e=>e.horse.pos,check:e=>e.horse.tamed}],reward:{xp:150}},quickdraw:{title:`Quick Draw`,stages:[{text:`Hit all 8 cans at the range behind the church`,target:e=>e.world.anchors.range.shooter,on:{range:()=>!0}},{text:`Brag to Miss Clementine`,target:e=>e.npcs.clementine.pos,on:{talked:e=>e===`clementine`}}],reward:{xp:100,money:30}},gold:{title:`Gold Fever`,stages:[{text:`Talk to Old Pete at the Silver Spur Mine`,target:e=>e.npcs.pete.pos,on:{talked:e=>e===`pete`}},{text:e=>`Find gold nuggets in the hills and along the river (${Math.min(5,e.progress.nuggets)}/5)`,target:e=>e.collectibles.nearest(`nugget`,e.player.pos,e.progress.skills.xenosight?400:0),check:e=>e.progress.nuggets>=5},{text:`Bring the nuggets to Old Pete`,target:e=>e.npcs.pete.pos,on:{talked:e=>e===`pete`}}],reward:{xp:150,money:60}},phonehome:{title:`Phone Home`,main:!0,stages:[{text:`Find Billy down by Lake Serenity`,target:e=>e.npcs.billy.pos,on:{talked:e=>e===`billy`}},{text:e=>`Recover the pieces of your saucer (${e.progress.parts.length}/6)`,target:e=>e.collectibles.nearest(`part`,e.player.pos,9999),check:e=>e.progress.parts.length>=6},{text:`Return to the crash site and repair your saucer`,target:()=>wg(Y.crash.x,Y.crash.z),check:e=>![`crashed`,`repairing`].includes(e.saucerCtl.state)},{text:`Take her for a spin. Fly over Billy at the lake!`,target:e=>e.npcs.billy.pos,on:{flyby:()=>!0}}],reward:{xp:500,money:100}}};function wg(e,t){return new V(e,X(e,t),t)}var Tg=class{constructor(e){this.game=e,this.state={},this.tracked=null}active(){return Object.keys(this.state).filter(e=>!this.state[e].done)}isAt(e,t){let n=this.state[e];return n&&!n.done&&n.stage===t}done(e){return this.state[e]?.done}started(e){return!!this.state[e]}start(e,t=!1){this.state[e]||(this.state[e]={stage:0,done:!1,count:0},this.tracked=e,t||(this.game.ui?.questBanner(`New quest`,Cg[e].title),this.game.audio?.chime()),this.game.ui?.refresh())}stageText(e){let t=this.state[e],n=Cg[e].stages[t.stage];return typeof n.text==`function`?n.text(this.game,t):n.text}target(e){let t=this.state[e];if(!t||t.done)return null;let n=Cg[e].stages[t.stage];return n.target?n.target(this.game,t):null}advance(e){let t=this.state[e],n=Cg[e];if(t.stage+=1,t.count=0,t.stage>=n.stages.length)return this.complete(e);this.game.audio?.blip(1.4),this.game.ui?.toast(`Objective`,this.stageText(e),`quest`),this.game.ui?.refresh(),this.game.save()}complete(e){let t=this.state[e],n=Cg[e];t.done=!0,this.game.ui?.questBanner(`Quest complete`,n.title),this.game.audio?.questComplete();let r=n.reward||{};r.xp&&this.game.progress.addXP(r.xp,n.title),r.money&&this.game.progress.addMoney(r.money,n.title),this.game.story.onQuestComplete(e);for(let e of n.next||[])this.start(e,!0);n.next?.length&&setTimeout(()=>this.game.ui?.questBanner(`New quests`,n.next.map(e=>Cg[e].title).join(` · `)),2600),this.tracked===e&&(this.tracked=this.active()[0]||null),this.game.ui?.refresh(),this.game.save()}emit(e,t){for(let n of this.active()){let r=this.state[n],i=Cg[n].stages[r.stage].on?.[e];i&&i(t,this.game,r)?this.advance(n):i&&this.game.ui?.refresh()}}update(){for(let e of this.active()){let t=this.state[e],n=Cg[e].stages[t.stage];n.check&&n.check(this.game,t)&&this.advance(e)}}toJSON(){return{state:this.state,tracked:this.tracked}}load(e){this.state=e.state||{},this.tracked=e.tracked}};function Eg(e){let t=e.town,n=e.ranch,r=e.mine,i=Y.lake,a=wg(i.x+28,i.z-64);return[{id:`sheriff`,name:`Sheriff Hank Dawson`,title:`Keeper of the Peace`,pos:t.sheriff,yaw:Math.PI,look:{species:`human`,skin:`#c99672`,shirt:`#6a7f8f`,pants:`#3e3a36`,vest:`#3a2a20`,hat:`gambler`,mustache:!0,hair:`#6a5a4a`,star:!0,gun:!0,bandana:!1}},{id:`clementine`,name:`Miss Clementine`,title:`Saloon Proprietor`,pos:t.clementine,yaw:0,look:{species:`human`,skin:`#e8b996`,dress:`#7a2436`,hair:`#b8562a`,longHair:!0,bandana:`#1e1a1a`}},{id:`otis`,name:`Otis Pickett`,title:`General Store`,pos:t.otis,yaw:0,look:{species:`human`,skin:`#d9a57e`,shirt:`#e8e2d2`,pants:`#4a4a52`,apron:`#d8cfb8`,hat:`bowler`,mustache:!0,hair:`#4a3a2a`,bandana:!1}},{id:`ma`,name:`Ma McCready`,title:`Rancher`,pos:n.ma,yaw:.6,look:{species:`human`,skin:`#d6a07a`,dress:`#4a6a8a`,apron:`#efe6d4`,hair:`#9a9a9a`,longHair:!0,hat:`cattleman`,bandana:`#b08a3a`}},{id:`billy`,name:`Billy Tate`,title:`Big Dreamer, Age 12`,pos:a,yaw:2.6,look:{species:`human`,skin:`#e3b08a`,shirt:`#a84a3a`,pants:`#44506a`,hat:`cattleman`,hair:`#c89a4a`,bandana:!1}},{id:`pete`,name:`Old Pete`,title:`Prospector`,pos:r.pete,yaw:.6,pose:`sit`,noWave:!0,look:{species:`human`,skin:`#c48a64`,shirt:`#8a7a5a`,pants:`#5a4a3a`,hat:`cattleman`,beard:!0,hair:`#dcdcdc`,bandana:`#3a5a8a`}},{id:`drifter`,name:`Silas`,title:`Townsfolk`,pos:wg(-220,-110),wander:[wg(-238,-111),wg(-196,-109),wg(-172,-111),wg(-196,-111.5)],look:{species:`human`,skin:`#8a5a3a`,shirt:`#c8b89a`,pants:`#3a3a3a`,vest:`#6a2a1a`,hat:`stetson`,mustache:!0,hair:`#1a1a1a`,gun:!0}},{id:`lady`,name:`Mrs. Pruitt`,title:`Townsfolk`,pos:wg(-185,-108),wander:[wg(-185,-108),wg(-150,-104),wg(-128,-101),wg(-160,-106)],look:{species:`human`,skin:`#f0c8a8`,dress:`#5a7a5a`,hair:`#3a2a1a`,longHair:!0,bandana:!1}}]}var Dg=e=>e[Math.floor(Math.random()*e.length)],Og=class{constructor(e){this.game=e}onQuestComplete(e){let t=this.game;e===`ropes`&&t.collectibles.givePart(`hull`),e===`mustang`&&(t.progress.grantSkill(`riding`,1),t.ui.hint(`Press [E] next to Stardust to mount, [H] to whistle for him.`)),e===`quickdraw`&&t.progress.skills.quickdraw<1&&t.progress.grantSkill(`quickdraw`,1),e===`phonehome`&&setTimeout(()=>t.showEnding(),4500)}talk(e){let t=this.game,n=t.quests,r=t.progress,i=(e,t)=>({text:e,choices:t}),a=e=>({end:e});switch(e){case`sheriff`:return n.isAt(`howdy`,0)?[i(`Well now. Ain't never seen a fella quite so... green. You feelin' poorly, son?`,[{label:`Just a long trip. Real long.`,then:[i(`Hmph. Where you ridin' in from?`),i(`*You point up.* Out of town. About forty light years out.`),i(`...Never heard of it. Must be somewhere past Kansas.`)]},{label:`I come in peace. Also, I like your hat.`,then:[i(`...Well. It IS a mighty fine hat.`),i(`*The Sheriff straightens it proudly.* Peace is what we like around here.`)]},{label:`Take me to your leader.`,then:[i(`Leader? That'd be Mayor Pruitt, but he's gone fishin' till Tuesday.`),i(`Reckon you'll have to settle for me.`)]}]),i(`Look here, stranger. Dusty Gulch don't judge a body by its color, even when it's THAT color.`),i(`But folks respect honest work. Go see Miss Clementine at the saloon. She knows everybody's business before they do.`),a(()=>n.emit(`talked`,`sheriff`))]:r.flags.flew?[i(`Saw somethin' shiny zip over the church last night. Now I ain't sayin' it was you...`),i(`...but it had real nice manners. Didn't scare a single horse.`)]:[i(Dg([`Keep your nose clean, Zeke. And your... whatever that is. Also clean.`,`Quiet day. Just how I like 'em.`,`Folks been sayin' good things about you. Don't let it go to your big ol' head.`,`If you see Silas cheatin' at cards, you let me know.`]))];case`clementine`:return n.isAt(`howdy`,1)?[i(`Well, butter my biscuit. Hank sent you over? Then you're alright by me, sugar.`),i(`Name's Clementine. And what do they call you?`,[{label:`"Zeke."`,then:[i(`Zeke! Short and sweet. I like it.`)]},{label:`"Zxq'thaal of the Seventh Moon of Varr."`,then:[i(`...`),i(`I'm gonna call you Zeke.`)]}]),i(`Here's the lay of the land, Zeke. Ma McCready's ranch is east along the road, and she always needs a hand with her cattle.`),i(`And young Billy down at Lake Serenity has been hollerin' all week about lights in the sky and shiny junk fallin' out of it.`),i(`*She looks at your eyes. Then at your hat.* ...Maybe you know somethin' about that.`),i(`Oh, and if you fancy yourself a gunslinger, there's tin cans set up behind the church. Hit all eight and I'll make it worth your while.`),a(()=>{n.emit(`talked`,`clementine`),r.flags.named=!0})]:n.isAt(`quickdraw`,1)?[i(`All eight?! Why, Zeke, you're quicker than a rattler with a train to catch.`),i(`Here, drinks are on the house. Well, this one sarsaparilla is.`),a(()=>n.emit(`talked`,`clementine`))]:[i(Dg([`What'll it be, sugar?`,`Evenin', Zeke. Or is it mornin' where you're from?`,`You keep that hat on indoors. Suits you.`]),[{label:`Rent a room till morning ($5)`,then:()=>r.money<5?[i(`Five dollars, sugar. Ma McCready pays for honest work, you know.`)]:(r.addMoney(-5,`Room at the saloon`),t.sleep(),[i(`Sweet dreams, Zeke. Mind the creaky stair.`)])},{label:`Heard any rumors?`,then:()=>[i(this.rumor())]},{label:`Just passing through.`,then:[i(`Ain't we all, sugar. Ain't we all.`)]}])];case`otis`:return[i(r.flags.metOtis?`Back again! Hats don't buy themselves, you know.`:`Welcome to Pickett's General Store! We got hats. We got... well, mostly hats.`,[{label:`Show me the hats`,then:()=>(t.ui.openJournal(`wardrobe`),null)},{label:n.started(`gold`)&&!n.done(`gold`)?`Sell gold nuggets (${r.nuggets} × $12), though Old Pete wants five`:`Sell gold nuggets (${r.nuggets} × $12)`,then:()=>{if(r.nuggets<1)return[i(`Ain't nothin' in your pockets but lint, friend.`)];let e=r.nuggets;return r.nuggets-=e,r.addMoney(e*12,`Sold ${e} nugget${e>1?`s`:``}`),[i(`Pleasure doin' business! Don't spend it all in one saloon.`)]}},{label:`Just browsing`,then:[i(`Take your time. The hats ain't goin' anywhere.`)]}]),a(()=>{r.flags.metOtis=!0})];case`ma`:return n.isAt(`ropes`,0)?[i(`You the new hand? Lord, you're skinny. And green. You eatin' enough?`),i(`Can you rope?`,[{label:`What's a rope?`,then:[i(`Heavens to Betsy.`)]},{label:`I'm a quick learner.`,then:[i(`We'll see about that.`)]}]),i(`Watch close now. Make a loop, swing it over your head, and let fly. Easy as pie.`),a(()=>{r.grantSkill(`lasso`,1)}),i(`Three of my girls wandered off: Daisy, Buttercup and Moonpie. Rope 'em with [F] and lead 'em back into the pen by the barn.`),a(()=>n.emit(`talked`,`ma`))]:n.isAt(`ropes`,2)?[i(`Well I'll be. All three, safe and sound. You're a natural, Zeke.`),i(`Here's your wages. And, uh... this shiny thing landed in my pig trough last week. Hummed all night. Figure it's yours?`),a(()=>n.emit(`talked`,`ma`)),i(`One more thing. There's a wild mustang in the corral nobody can ride. Think you could gentle him?`)]:n.isAt(`mustang`,0)?[i(`That mustang's got fire in him. Hold on tight, and lean against the buck. [A]/[D]`)]:n.done(`mustang`)?[i(Dg([`Sit tall, heels down. That horse is yours now, partner.`,`Stardust sure took a shine to you. Takes one stranger to know another, I s'pose.`,`Some lands welcome different dreamers, Zeke. This is one of 'em.`]))]:[i(`Chores don't do themselves, but they don't mind waitin' neither.`)];case`billy`:return n.isAt(`phonehome`,0)?[i(`WHOA! You're... you're a real... I KNEW IT! I told EVERYBODY!`),i(`*He drops his fishing rod.*`,[{label:`Shh. Can you keep a secret?`,then:[i(`*nods so hard his hat falls off*`)]},{label:`I'm just a regular cowboy.`,then:[i(`With THREE FINGERS? And those EYES? Nice try, mister.`)]}]),i(`I saw your ship come down! Pieces went flyin' everywhere, like fireworks!`),i(`One plopped onto the little island out in the lake. One went clear over to the water tower in town, WAY up top.`),i(`A big one smacked into Lookout Hill, out east. And Old Pete up at the mine was cussin' about somethin' glowin' in his tunnel!`),i(`There's one in your crater, I bet. And Ma McCready's pigs found one too.`),i(`If you fix your ship... can I see it fly? Please? PLEASE?`),a(()=>n.emit(`talked`,`billy`))]:n.done(`phonehome`)?[i(`BEST. DAY. EVER. I'm gonna be an astronaut. Or a cowboy. Or BOTH, like you!`)]:r.parts.length>0?[i(`You found ${r.parts.length} of \'em! Only ${6-r.parts.length} more to go!`)]:[i(`Fish ain't bitin'. Maybe they're scared of aliens. No offense.`)];case`pete`:return n.isAt(`gold`,0)||!n.started(`gold`)?[i(`Eh? Who's there? ...Oh. A little green feller. Seen stranger things up in them hills.`),i(`...Well. Not many.`),i(`Mine's been played out for years, but there's still color in these hills. Gold nuggets, shiny little devils. They wash down along the river too.`),i(`Bring me five of 'em and I'll pay ya fair. Otis will buy any extras.`),i(`And somethin' glowin' tumbled into my old tunnel. Scared off all the bats. Go on in if you like, it's yours I reckon.`),a(()=>{n.started(`gold`)||n.start(`gold`,!0),n.emit(`talked`,`pete`)})]:n.isAt(`gold`,2)&&r.nuggets<5?[i(`That's ${r.nuggets}. I said five, greenhorn. Five!`)]:n.isAt(`gold`,2)?[i(`Hoo-wee! Look at that color! You've got the knack, greenhorn. Or is it green-thumb? Green-everything.`),a(()=>{r.nuggets=Math.max(0,r.nuggets-5),n.emit(`talked`,`pete`)})]:[i(Dg([`Gold's where you find it. Usually it ain't where you look.`,`Sit a spell. Fire's warm, beans are... well, they're beans.`,`Seen the stars out here at night? Reckon you have. Reckon you've been closer.`]))];case`drifter`:return[i(Dg([`Nice hat, friend.`,`Mind yourself, greenhorn.`,`Heard there's strange lights over the cornfield at night.`,`You play poker? ...Never mind. Them eyes would clean me out.`]))];case`lady`:return[i(Dg([`Good day to you!`,`My husband's the mayor, you know. He's fishing.`,`What lovely... skin tone. Very... springlike.`,`Church social's on Sunday. Everyone's welcome. Even you, dear.`]))];default:return[i(`Howdy.`)]}}rumor(){let e=this.game,t=e.quests;return t.done(`ropes`)?t.started(`gold`)?e.progress.parts.length<6?`Billy swears there's glowin' junk all over the county. Lookout Hill, the lake island, even up on our water tower!`:`Folks say the stars look brighter since you came to town, Zeke.`:`Old Pete's still pannin' up at the Silver Spur Mine, northwest of town. Pays good for gold.`:`Ma McCready's cows keep wanderin'. That woman needs a real cowhand.`}},kg={coil:`Power Coil`,hull:`Hull Plating`,crystal:`Navigation Crystal`,gravity:`Gravity Plate`,antenna:`Antenna Array`,plasma:`Plasma Regulator`};function Ag(e){let t=new H,n=new co({color:`#c8ccd2`,metalness:.95,roughness:.25}),r=new co({color:`#0a2a2a`,emissive:`#48ffd8`,emissiveIntensity:3});if(e===`coil`)t.add(new G(new Xa(.22,.06,64,8,2,5),r)),t.add(new G(new bi(.08,.08,.7,10),n));else if(e===`crystal`){let e=new G(new Ua(.35,0),new lo({color:`#8affea`,emissive:`#2affd0`,emissiveIntensity:1.5,roughness:.05,transmission:.3,transparent:!0,opacity:.9}));e.scale.y=1.6,t.add(e)}else if(e===`antenna`){t.add(new G(new bi(.03,.03,1,6),n));let e=new G(new Ja(.3,16,8,0,Math.PI*2,0,1),n);e.material.side=2,e.position.y=.3,e.rotation.x=Math.PI,t.add(e);let i=new G(new Ja(.06,8,6),r);i.position.y=.55,t.add(i)}else if(e===`gravity`){t.add(new G(new bi(.45,.45,.08,6),n));let e=new G(new Ya(.3,.04,6,6),r);e.rotation.x=Math.PI/2,t.add(e)}else if(e===`plasma`){t.add(new G(new bi(.18,.18,.6,12),new lo({color:`#b9fff0`,emissive:`#48ffd8`,emissiveIntensity:2,transparent:!0,opacity:.8})));for(let e of[-.32,.32]){let r=new G(new bi(.22,.22,.08,12),n);r.position.y=e,t.add(r)}}else{t.add(new G(new _i(.8,.06,.5),n));let e=new G(new _i(.5,.07,.05),r);e.position.y=.01,t.add(e)}return t.traverse(e=>{e.isMesh&&(e.castShadow=!0)}),t}function jg(){let e=new H,t=new Ci(.13,0),n=t.attributes.position;for(let e=0;e<n.count;e++)n.setXYZ(e,n.getX(e)*(.8+Math.random()*.4),n.getY(e)*.7,n.getZ(e)*(.8+Math.random()*.4));t.computeVertexNormals();let r=new G(t,new co({color:`#f2c14e`,metalness:1,roughness:.25,emissive:`#6a4a08`,emissiveIntensity:.6,flatShading:!0}));return r.castShadow=!0,e.add(r),e}var Mg=class{constructor(e){this.game=e,this.items=[];let t=e.world.anchors,n={coil:new V(Y.crash.x-3,0,Y.crash.z+4),crystal:new V(Y.lake.x+18,0,Y.lake.z+12),gravity:t.mineInside.clone(),antenna:t.waterTowerTop.clone(),plasma:new V(Y.lookout.x+2,0,Y.lookout.z-3)};for(let[e,t]of Object.entries(n))e!==`antenna`&&(t.y=Math.max(X(t.x,t.z),Hd)),this.add(`part`,e,t);let r=Bd(1849),i=0,a=0;for(;i<34&&a<5e3;){a++;let e,t;if(i<16){let n=r()*Math.PI*2,i=25+r()*110;e=Y.mine.x+Math.cos(n)*i,t=Y.mine.z+Math.sin(n)*i}else{e=(r()*2-1)*520,t=(r()*2-1)*520;let n=rf.dist(e,t);if(n<9.9||n>19.8)continue}_f(e,t)||sf(e,t)>.6||gf(e,t).y<.75||(this.add(`nugget`,`n${i}`,new V(e,X(e,t),t)),i++)}}add(e,t,n){let r=e===`part`?Ag(t):jg(),i=new H;i.position.copy(n),i.add(r);let a=null;if(e===`part`){a=_m(`#6affd6`,70),i.add(a);let e=new ms(`#5affd0`,3,8,1.8);e.position.y=1,i.add(e)}this.game.scene.add(i),this.items.push({type:e,id:t,pos:n.clone(),holder:i,obj:r,beam:a,taken:!1,phase:Math.random()*6})}restore(e){for(let t of this.items)e.includes(t.id)&&(t.taken=!0,this.hide(t))}hide(e){for(let t of e.holder.children)t.isLight?t.intensity=0:t.visible=!1}nearest(e,t,n){let r=null,i=n;for(let n of this.items){if(n.taken||n.type!==e)continue;let a=n.pos.distanceTo(t);a<i&&(i=a,r=n.pos)}return r}givePart(e){let t=this.game;t.progress.parts.includes(e)||(t.progress.parts.push(e),t.ui.toast(`Saucer part recovered`,`${kg[e]} (${t.progress.parts.length}/6)`,`part`),t.audio.pickupPart(),t.progress.addXP(60,kg[e]),t.quests.emit(`part`,e))}update(e,t){let n=this.game,r=n.player.mode===`fly`?n.saucerCtl.pos:n.player.pos;for(let i of this.items){if(i.taken)continue;i.phase+=e,i.obj.position.y=(i.type===`part`?.9:.12)+Math.sin(i.phase*2)*(i.type===`part`?.15:.03),i.obj.rotation.y+=e*(i.type===`part`?1.2:.6),i.beam&&(i.beam.userData.mat.uniforms.uTime.value=t),i.type===`nugget`&&Math.random()<e*1.5&&i.pos.distanceToSquared(r)<900&&n.fx.sparkle(i.pos.clone().add(new V(0,.2,0)),`#ffe08a`);let a=n.player.mode===`fly`?0:1.7;i.pos.distanceTo(n.player.pos)<a+(i.type===`part`?.4:0)&&(i.taken=!0,this.hide(i),n.progress.collected.push(i.id),n.fx.burst(i.pos.clone().add(new V(0,.8,0)),i.type===`part`?`#6affd6`:`#ffd66a`),i.type===`part`?this.givePart(i.id):(n.progress.nuggets+=1,n.audio.pickupGold(),n.progress.addXP(15,`Gold nugget`),n.quests.emit(`nugget`),!n.quests.started(`gold`)&&n.progress.nuggets===1&&n.ui.hint(`Shiny! Somebody around here probably pays for gold.`)),n.save())}}},Ng=new co({color:`#c9a66b`,roughness:.9}),Pg=new rr({color:`#6affc8`,transparent:!0,opacity:.35,blending:2,depthWrite:!1,side:2});function Fg(e,t=0){let n=new V;return e.arms[t].hand.getWorldPosition(n),n}var Ig=class{constructor(e){this.game=e,this.target=null,this.throwT=0,this.mesh=null,this.loop=new G(new Ya(.45,.025,5,20),Ng),this.loop.visible=!1,e.scene.add(this.loop)}get range(){return[0,11,17,24][this.game.progress.skills.lasso]}trigger(){let e=this.game,t=e.player;if(this.target){this.release();return}if(e.rodeo.active)return;if(e.progress.skills.lasso<1){e.ui.hint(`You don't know how to throw a lasso yet. Maybe a rancher could teach you.`);return}if(t.mode!==`walk`&&!t.mount)return;let n=t.pos,r=null,i=this.range,a=new V(Math.sin(t.yaw),0,Math.cos(t.yaw)),o=t.forward;for(let t of e.cows){if(t.state===`beamed`||t.airborne)continue;let e=t.pos.distanceTo(n),s=t.pos.clone().sub(n).setY(0).normalize();e<i&&(s.dot(a)>.2||s.dot(o)>.4)&&(i=e,r=t)}if(!r){e.ui.hint(`No cow in range. Face one and press [F].`),t.startAction(`lasso`,.6),e.audio.whoosh();return}this.target=r,this.throwT=0,t.startAction(`throw`,.4),e.audio.whoosh(),t.mount||(t.yaw=Math.atan2(r.pos.x-t.pos.x,r.pos.z-t.pos.z))}release(){this.target&&(this.target.leashedTo=null),this.target=null,this.mesh&&=(this.mesh.geometry.dispose(),this.game.scene.remove(this.mesh),null),this.loop.visible=!1}update(e){let t=this.game,n=this.target;if(!n)return;if(n.state===`beamed`||t.player.mode===`swim`||t.player.mode===`fly`){this.release();return}this.throwT+=e;let r=Fg(t.player.rig),i=n.pos.clone().add(new V(Math.sin(n.yaw)*.9,1.2,Math.cos(n.yaw)*.9)),a=Id(this.throwT/.35,0,1),o=r.clone().lerp(i,a);a<1&&(o.y+=Math.sin(a*Math.PI)*1.5),a>=1&&!n.leashedTo&&(n.leashedTo=t.player.mount?t.player.mount.pos:t.player.pos,t.audio.moo(n.pos,1.2),n.state=`wander`);let s=r.distanceTo(o),c=Math.max(0,3.4-s)*.35+.15,l=r.clone().lerp(o,.5);l.y-=c;let u=new Yi(r,l,o);this.mesh?(this.mesh.geometry.dispose(),this.mesh.geometry=new Za(u,16,.02,4,!1)):(this.mesh=new G(new Za(u,16,.02,4,!1),Ng),this.mesh.castShadow=!0,t.scene.add(this.mesh)),this.loop.visible=!0,this.loop.position.copy(o),this.loop.rotation.set(Math.PI/2,0,0),s>this.range+8&&this.release();let d=t.world.anchors.pen;n.leashedTo&&n.pos.x>d.x0+.3&&n.pos.x<d.x1&&n.pos.z>d.z0&&n.pos.z<d.z1&&(this.release(),this.game.penCow(n))}},Lg=class{constructor(e){this.game=e,this.target=null,this.mesh=new G(new bi(.25,1.1,1,16,1,!0),Pg),this.mesh.visible=!1,e.scene.add(this.mesh),this.hold=new V}get range(){return[0,10,16,24][this.game.progress.skills.beam]}candidates(){let e=this.game,t=e.cows.filter(e=>!e.leashedTo).map(e=>({kind:`cow`,ent:e,pos:e.pos}));for(let n of e.tumbleweeds.items)t.push({kind:`weed`,ent:n,pos:n.pos});for(let n of e.range.cans)n.down||t.push({kind:`can`,ent:n,pos:n.mesh.position});return t}update(e,t){let n=this.game,r=n.player,i=t.down(`KeyQ`)&&r.mode===`walk`&&!r.mount&&!r.aiming;if(i&&!this.target){if(n.progress.skills.beam<1){t.hit(`KeyQ`)&&n.ui.hint(`Your tractor beam is offline. Spend a skill point on it in your journal [Tab].`);return}let e=null,i=this.range,a=new V(Math.sin(r.yaw),0,Math.cos(r.yaw));for(let t of this.candidates()){let n=t.pos.distanceTo(r.pos),o=t.pos.clone().sub(r.pos).setY(0).normalize();n<i&&(o.dot(a)>0||n<3)&&(i=n,e=t)}e?(this.target=e,e.kind===`cow`&&(e.ent.state=`beamed`,n.audio.moo(e.ent.pos,1.5)),n.audio.beamStart(),e.kind===`cow`&&!n.progress.flags.firstAbduct&&(n.progress.flags.firstAbduct=!0,n.progress.addXP(30,`Close Encounter`))):t.hit(`KeyQ`)&&n.ui.hint(`Nothing to lift nearby.`)}if(!i&&this.target&&this.drop(),!this.target){this.mesh.visible=!1,r.beaming=!1,n.audio.beamLevel(0);return}r.beaming=!0,r.startAction(`beam`,.1);let a=this.target,o=new V(Math.sin(r.yaw),0,Math.cos(r.yaw));this.hold.copy(r.pos).addScaledVector(o,a.kind===`cow`?3.2:2.2),this.hold.y=r.pos.y+(a.kind===`cow`?3.2:2.6)+Math.sin(performance.now()*.003)*.2;let s=a.kind===`cow`||a.kind===`weed`?a.ent.pos:a.ent.mesh.position;s.lerp(this.hold,1-Math.exp(-e*(2+n.progress.skills.beam))),a.kind===`weed`&&(a.ent.vel.set(0,0,0),a.ent.vy=0),a.kind===`can`&&(a.ent.vel.set(0,0,0),a.ent.down=!1,a.ent.mesh.rotation.x+=e*3);let c=Fg(r.rig,0).lerp(Fg(r.rig,1),.5),l=s.clone();a.kind===`cow`&&(l.y+=.8);let u=c.distanceTo(l);this.mesh.visible=!0,this.mesh.position.copy(c).lerp(l,.5),this.mesh.scale.set(1,u,1),this.mesh.quaternion.setFromUnitVectors(new V(0,1,0),l.clone().sub(c).normalize()),Pg.opacity=.22+Math.sin(performance.now()*.02)*.06,n.audio.beamLevel(1),Math.random()<e*20&&n.fx.sparkle(l.clone().add(new V((Math.random()-.5)*1.5,Math.random()-.5,(Math.random()-.5)*1.5)),`#8affd8`)}drop(){let e=this.target;this.target=null,this.mesh.visible=!1;let t=this.game;if(e){if(e.kind===`cow`){e.ent.state=`graze`,e.ent.airborne=!0,e.ent.vy=0,t.progress.stats.abducted+=1;let n=t.world.anchors.pen,r=e.ent;r.pos.x>n.x0&&r.pos.x<n.x1&&r.pos.z>n.z0&&r.pos.z<n.z1&&t.penCow(r)}else e.kind===`can`&&(e.ent.vel.set(0,0,0),e.ent.falling=!0);t.audio.beamLevel(0)}}},Rg=class{constructor(e){this.game=e;let t=e.world.anchors.range;this.anchor=t,this.cans=t.cans.map((t,n)=>{let r=new G(new bi(.07,.07,.2,12),new co({color:[`#c23b2a`,`#d8b04a`,`#3a6aa8`,`#e8e2d6`][n%4],metalness:.7,roughness:.35}));return r.castShadow=!0,r.position.copy(t),e.scene.add(r),{mesh:r,home:t.clone(),vel:new V,spin:new V,down:!1,falling:!1,resetT:0}}),this.active=!1,this.time=0,this.hits=0,this.bolts=[],this.raycaster=new Gs}reset(){for(let e of this.cans)e.mesh.position.copy(e.home),e.mesh.rotation.set(0,0,0),e.down=!1,e.falling=!1,e.vel.set(0,0,0)}start(){this.reset(),this.active=!0,this.hits=0,this.time=20+(this.game.progress.skills.quickdraw>=2?3:0),this.game.ui.hint(`Hold right mouse to aim, left click to shoot. Hit all 8 cans!`),this.game.audio.chime()}shoot(){let e=this.game,t=e.camera;this.raycaster.setFromCamera(new z(0,0),t),this.raycaster.far=200;let n=new V;e.player.rig.gun.localToWorld(n.copy(e.player.rig.gun.userData.muzzle));let r=null,i=null,a=1e9;for(let e of this.cans){if(e.down)continue;let n=new Pn(e.mesh.position,.18),o=this.raycaster.ray.intersectSphere(n,new V);if(o){let n=o.distanceTo(t.position);n<a&&(a=n,r=o,i=e)}}for(let n of e.cows){let o=this.raycaster.ray.intersectSphere(new Pn(n.pos.clone().setY(n.pos.y+1),1),new V);if(o){let s=o.distanceTo(t.position);s<a&&(a=s,r=o,i=null,e.audio.moo(n.pos,1.4),n.speed=5,n.state=`wander`,n.target.set(n.pos.x+(n.pos.x-e.player.pos.x),0,n.pos.z+(n.pos.z-e.player.pos.z)),n.timer=3)}}if(!r){let e=this.raycaster.ray;for(let t=1;t<150;t+=1){let n=e.at(t,new V);if(n.y<X(n.x,n.z)){r=n;break}}r||=e.at(150,new V)}if(this.bolt(n,r),e.audio.laser(),e.fx.burst(r,`#8affd8`,6),i){i.down=!0,i.falling=!0;let n=r.clone().sub(t.position).normalize();i.vel.set(n.x*4+(Math.random()-.5)*2,3+Math.random()*2,n.z*4+(Math.random()-.5)*2),i.spin.set(Math.random()*20-10,Math.random()*10,Math.random()*20-10),e.audio.ping(),e.progress.stats.cans+=1,this.active&&(this.hits+=1,this.hits>=this.cans.length&&(this.active=!1,e.ui.toast(`Sharpshooter!`,`All 8 cans with ${this.time.toFixed(1)} s to spare`,`quest`),e.progress.addXP(40,`Target practice`),e.quests.emit(`range`)))}}bolt(e,t){let n=new G(new bi(.03,.03,e.distanceTo(t),6,1,!0),new rr({color:`#9affdf`,transparent:!0,blending:2,depthWrite:!1}));n.position.copy(e).lerp(t,.5),n.quaternion.setFromUnitVectors(new V(0,1,0),t.clone().sub(e).normalize()),this.game.scene.add(n),this.bolts.push({m:n,t:.12}),this.game.fx.flash(e)}update(e){for(let t=this.bolts.length-1;t>=0;t--){let n=this.bolts[t];n.t-=e,n.m.material.opacity=Math.max(0,n.t/.12),n.m.scale.x=n.m.scale.z=1+(.12-n.t)*12,n.t<=0&&(this.game.scene.remove(n.m),n.m.geometry.dispose(),n.m.material.dispose(),this.bolts.splice(t,1))}let t=!0;for(let n of this.cans){if(n.falling){n.vel.y-=18*e,n.mesh.position.addScaledVector(n.vel,e),n.mesh.rotation.x+=n.spin.x*e,n.mesh.rotation.z+=n.spin.z*e;let t=X(n.mesh.position.x,n.mesh.position.z)+.07;n.mesh.position.y<t&&(n.mesh.position.y=t,n.vel.multiplyScalar(.4),n.vel.y=Math.abs(n.vel.y)>1?-n.vel.y*.4:0,n.spin.multiplyScalar(.5),n.vel.length()<.3&&(n.falling=!1,n.mesh.rotation.x=Math.PI/2))}n.down||(t=!1)}this.active?(this.time-=e,this.time<=0&&(this.active=!1,this.game.ui.toast(`Out of time`,`${this.hits}/8 cans. Press [E] at the range to try again`,`fail`),this.game.audio.fail())):(t||this.cans.some(e=>e.down))&&(this.resetT=(this.resetT||0)+e,this.resetT>10&&(this.resetT=0,this.reset()))}},zg=class{constructor(e){this.game=e,this.active=!1}start(){let e=this.game;e.lasso.release(),this.active=!0,this.balance=0,this.bv=0,this.time=0,this.goal=10,e.horse.state=`buck`,e.player.mount=e.horse,e.horse.rider=e.player,e.horse.speed=0,e.ui.rodeo(!0),e.audio.neigh()}update(e,t){if(!this.active)return;let n=this.game;this.time+=e;let r=this.time,i=1.15+r*.2,a=(Math.sin(r*2.3)+Math.sin(r*3.7+1.3)*.7+(Math.random()-.5)*1.8)*i,o=(t.down(`KeyD`)||t.down(`ArrowRight`)?1:0)-(t.down(`KeyA`)||t.down(`ArrowLeft`)?1:0);if(this.bv+=(a+this.balance*1.2+o*6)*e,this.bv*=Math.exp(-1.5*e),this.balance+=this.bv*e,n.horse.yaw+=Math.sin(r*1.3)*e*1.5,n.horse.rig.buck=1,n.horse.rig.update(e,{speed:0}),n.horse.object.rotation.y=n.horse.yaw,n.player.object.rotation.z=this.balance*.5,n.ui.rodeoUpdate(this.balance,r/this.goal),Math.abs(this.balance)>1)return this.fail();if(r>=this.goal)return this.win()}fail(){let e=this.game;this.active=!1,e.ui.rodeo(!1),e.horse.state=`roam`,e.horse.rider=null,e.player.mount=null,e.player.object.rotation.z=0;let t=new V(Math.cos(e.horse.yaw)*Math.sign(this.balance),0,-Math.sin(e.horse.yaw)*Math.sign(this.balance));e.player.pos.copy(e.horse.pos).addScaledVector(t,1.5),e.player.pos.y+=1.5,e.player.vel.copy(t).multiplyScalar(6),e.player.vel.y=6,e.player.grounded=!1,e.audio.neigh(),e.audio.land(),e.ui.toast(`Thrown!`,`Lean against the buck with [A]/[D]. Walk up and try again.`,`fail`)}win(){let e=this.game;this.active=!1,e.ui.rodeo(!1),e.horse.state=`idle`,e.horse.rig.buck=0,e.horse.setTamed(!0),e.player.object.rotation.z=0,e.audio.neigh(),e.progress.flags.horseTamed=!0,e.quests.emit(`tamed`),e.quests.started(`mustang`)||e.progress.addXP(150,`Tamed a wild mustang`),e.ui.toast(`Tamed!`,`Stardust trusts you now. WASD to ride, Shift to gallop, E to dismount.`,`quest`)}},Bg=class{constructor(e,t){this.game=e,this.s=t,this.pos=new V,this.vel=new V,this.yaw=0,this.state=`crashed`,this.repairT=0,this.abduct=null,this.beam=new G(new bi(1.2,4,1,24,1,!0),Pg.clone()),this.beam.visible=!1,e.scene.add(this.beam);let n=Y.crash;this.crashPose={x:n.x,z:n.z,y:X(n.x,n.z)+.6,rx:.32,rz:-.18},this.lastPark={x:n.x,z:n.z},this.setCrashed()}setCrashed(){let e=this.crashPose;this.state=`crashed`,this.pos.set(e.x,e.y,e.z),this.s.group.position.copy(this.pos),this.s.group.rotation.set(e.rx,.7,e.rz)}park(e,t){this.state=`parked`,this.lastPark={x:e,z:t},this.pos.set(e,X(e,t)+1.85,t),this.s.group.position.copy(this.pos),this.s.group.rotation.set(0,this.yaw,0)}repair(){this.state=`repairing`,this.repairT=0,this.game.audio.repair()}board(){let e=this.game;this.state=`flying`,this.boardT=.6,e.player.mode=`fly`,e.player.object.visible=!1,e.lasso.release(),this.vel.set(0,3,0),e.ui.hint(`WASD fly · Space up · C down · Shift boost · Q abduction beam · E land`),e.audio.saucerHum(!0),e.player.cam.targetDist=18,e.progress.flags.flew=!0}land(){let e=this.game,t=X(this.pos.x,this.pos.z);if(this.pos.y-t>8){e.ui.hint(`Get lower to land (under 8 m).`);return}if(t<.6){e.ui.hint(`Can't land on water, partner.`);return}this.park(this.pos.x,this.pos.z),e.player.mode=`walk`,e.player.object.visible=!0;let n=new V(Math.cos(this.yaw),0,-Math.sin(this.yaw)).multiplyScalar(5.5);e.player.teleport(this.pos.x+n.x,this.pos.z+n.z,this.yaw),e.player.cam.targetDist=5.2,e.audio.saucerHum(!1),this.abduct&&this.releaseCow()}releaseCow(){let e=this.abduct;this.abduct=null,e.state=`graze`,e.airborne=!0,e.vy=0,e.object.visible=!0,e.pos.copy(this.pos),e.pos.y-=2}update(e,t){let n=this.game,r=this.s;if(this.state===`crashed`){r.update(e,{crashed:!0}),Math.random()<e*8&&n.fx.smoke(this.pos.clone().add(new V(1.5,.8,.5))),Math.random()<e*1.2&&n.fx.sparks(this.pos.clone().add(new V(-2.5,.6,1)));return}if(this.state===`repairing`){this.repairT+=e;let t=Math.min(1,this.repairT/4),i=this.crashPose,a=t*t*(3-2*t);r.group.rotation.set(i.rx*(1-a),.7,i.rz*(1-a)),this.pos.y=i.y+a*3.5+Math.sin(this.repairT*3)*.1*a,r.group.position.copy(this.pos),Math.random()<e*30&&n.fx.sparkle(this.pos.clone().add(new V((Math.random()-.5)*8,(Math.random()-.5)*2,(Math.random()-.5)*8)),`#8affd8`),r.update(e,{crashed:!1}),t>=1&&(this.yaw=.7,this.park(i.x,i.z),n.quests.emit(`repaired`),n.ui.toast(`Saucer repaired!`,`Walk up to it and press [E] to board.`,`quest`),n.audio.levelUp());return}if(this.state===`parked`){r.update(e,{crashed:!1}),r.group.position.y=this.pos.y+Math.sin(performance.now()*.0015)*.05;return}let i=n.player,a=+!!t.down(`KeyW`)-!!t.down(`KeyS`),o=+!!t.down(`KeyD`)-!!t.down(`KeyA`),s=+!!t.down(`Space`)-(t.down(`KeyC`)||t.down(`ControlLeft`)?1:0),c=i.forward,l=new V(-c.z,0,c.x),u=t.down(`ShiftLeft`)?2.1:1,d=new V().addScaledVector(c,a).addScaledVector(l,o);d.lengthSq()>0&&d.normalize(),d.multiplyScalar(32*u),d.y=s*14,this.vel.x=J(this.vel.x,d.x,2,e),this.vel.z=J(this.vel.z,d.z,2,e),this.vel.y=J(this.vel.y,d.y,3,e),this.pos.addScaledVector(this.vel,e);let f=Math.max(X(this.pos.x,this.pos.z),Hd);this.pos.y<f+2.5&&(this.pos.y=f+2.5,this.vel.y=Math.max(0,this.vel.y)),this.pos.y=Math.min(this.pos.y,320);let p=Math.hypot(this.pos.x,this.pos.z);p>690&&(this.pos.x*=690/p,this.pos.z*=690/p),(a||o)&&(this.yaw=zd(this.yaw,i.cam.yaw+Math.PI,2,e));let m=new V(this.vel.x,0,this.vel.z),h=m.dot(new V(Math.sin(this.yaw),0,Math.cos(this.yaw))),g=m.dot(new V(Math.cos(this.yaw),0,-Math.sin(this.yaw)));r.group.position.copy(this.pos),r.group.position.y+=Math.sin(performance.now()*.002)*.15,r.group.rotation.set(Id(h*.012,-.35,.35),this.yaw+performance.now()*3e-4,Id(-g*.012,-.35,.35),`YXZ`),r.update(e,{flying:!0,crashed:!1}),n.audio.saucerSpeed(m.length()/60),i.pos.copy(this.pos);let _=t.down(`KeyQ`);if(this.beam.visible=_,_){let e=this.pos.y-f;if(this.beam.position.set(this.pos.x,this.pos.y-e/2-.5,this.pos.z),this.beam.scale.set(1,e,1),this.beam.material.opacity=.2+Math.sin(performance.now()*.02)*.05,!this.abduct){for(let e of n.cows)if(Math.hypot(e.pos.x-this.pos.x,e.pos.z-this.pos.z)<5&&e.state!==`beamed`){this.abduct=e,e.state=`beamed`,e.leashedTo=null,n.audio.moo(e.pos,1.6),n.audio.beamStart();break}}}if(this.abduct){let t=this.abduct,r=this.pos.clone();r.y-=1.2,t.pos.lerp(r,1-Math.exp(-e*1.5)),t.pos.distanceTo(r)<1.2&&(t.object.visible=!1,t.counted||(t.counted=!0,n.progress.stats.abducted+=1,n.progress.addXP(20,`Cow abduction (for science)`))),!_&&t.object.visible?this.releaseCow():!_&&!t.object.visible&&(this.releaseCow(),n.ui.toast(`Cow returned`,`Slightly confused, mostly fine.`,`xp`))}n.npcs.billy&&Math.hypot(this.pos.x-n.npcs.billy.pos.x,this.pos.z-n.npcs.billy.pos.z)<40&&n.quests.emit(`flyby`),this.boardT=Math.max(0,(this.boardT||0)-e),t.hit(`KeyE`)&&this.boardT<=0&&this.land()}},Vg=new U,Hg=class{constructor(e){this.soft=new mm(e,{max:700}),this.glow=new mm(e,{max:500,additive:!0}),this.flashLight=new ms(`#8affd8`,0,10,2),e.add(this.flashLight),this.flashT=0,this.jetLight=new ms(`#7affe0`,0,7,2),e.add(this.jetLight)}dust(e,t=5){let n=t>9?3:1;for(let t=0;t<n;t++)this.soft.emit({x:e.x+(Math.random()-.5)*.4,y:e.y+.1,z:e.z+(Math.random()-.5)*.4,vx:(Math.random()-.5)*.8,vy:.4+Math.random()*.4,vz:(Math.random()-.5)*.8,life:1.2,size:.3,size1:1.1,r:.72,g:.62,b:.48,a:.35,drag:1.5})}splash(e,t=1){for(let n=0;n<12*t;n++){let t=Math.random()*6.28;this.soft.emit({x:e.x,y:e.y+.9,z:e.z,vx:Math.cos(t)*2,vy:2+Math.random()*2,vz:Math.sin(t)*2,life:.8,size:.2,size1:.05,r:.85,g:.95,b:1,a:.8,grav:-9,drag:.5})}}sparkle(e,t=`#ffffff`){Vg.set(t),this.glow.emit({x:e.x,y:e.y,z:e.z,vx:(Math.random()-.5)*.3,vy:.4+Math.random()*.5,vz:(Math.random()-.5)*.3,life:.9,size:.18,size1:.02,r:Vg.r,g:Vg.g,b:Vg.b,a:1,drag:1})}burst(e,t=`#ffffff`,n=30){Vg.set(t);for(let t=0;t<n;t++){let t=Math.random()*6.28,n=Math.random()*3.14,r=2+Math.random()*3;this.glow.emit({x:e.x,y:e.y,z:e.z,vx:Math.cos(t)*Math.sin(n)*r,vy:Math.cos(n)*r+1,vz:Math.sin(t)*Math.sin(n)*r,life:.8+Math.random()*.5,size:.2,size1:.02,r:Vg.r,g:Vg.g,b:Vg.b,a:1,grav:-3,drag:2})}}smoke(e){this.soft.emit({x:e.x+(Math.random()-.5),y:e.y,z:e.z+(Math.random()-.5),vx:.6+Math.random()*.4,vy:1.5+Math.random(),vz:.3,life:5,size:1.2,size1:5,r:.28,g:.27,b:.28,a:.35,drag:.2,fadeIn:.15})}sparks(e){for(let t=0;t<14;t++)this.glow.emit({x:e.x,y:e.y,z:e.z,vx:(Math.random()-.5)*5,vy:2+Math.random()*4,vz:(Math.random()-.5)*5,life:.6+Math.random()*.4,size:.1,size1:.02,r:.6,g:1,b:.9,a:1,grav:-12,drag:.5})}hoverGlow(e){this.glow.emit({x:e.x+(Math.random()-.5)*.3,y:e.y-.05,z:e.z+(Math.random()-.5)*.3,vx:Math.random()-.5,vy:-2,vz:Math.random()-.5,life:.5,size:.35,size1:.05,r:.4,g:1,b:.8,a:.8,drag:2})}jetFlame(e,t,n){for(let r=0;r<2;r++){let r=Math.random();this.glow.emit({x:e.x+(Math.random()-.5)*.04,y:e.y,z:e.z+(Math.random()-.5)*.04,vx:t.x*.3+(Math.random()-.5)*.6,vy:-5-Math.random()*3,vz:t.z*.3+(Math.random()-.5)*.6,life:.22+Math.random()*.14,size:.13*n,size1:.03,r:r>.5?.45:1,g:r>.5?1:.72,b:r>.5?.85:.3,a:1,drag:3})}Math.random()<.35&&this.soft.emit({x:e.x,y:e.y-.2,z:e.z,vx:(Math.random()-.5)*.5,vy:-1.5,vz:(Math.random()-.5)*.5,life:1.2,size:.25,size1:1,r:.8,g:.82,b:.85,a:.25*n,drag:1.5}),this.jetLight.position.set(e.x,e.y-.6,e.z),this.jetLight.intensity=1.6*n}flash(e){this.flashLight.position.copy(e),this.flashLight.intensity=25,this.flashT=.08}update(e){this.jetLight.intensity*=Math.exp(-e*10),this.soft.update(e),this.glow.update(e),this.flashT>0&&(this.flashT-=e,this.flashT<=0&&(this.flashLight.intensity=0))}},Ug=e=>440*2**((e-69)/12),Wg={D:[38,[50,57,62,66,69]],G:[43,[50,55,59,62,67]],A:[45,[52,57,61,64,69]],Bm:[47,[54,59,62,66,71]],Em:[40,[52,55,59,64,67]],A7:[45,[52,55,61,64,67]],Am:[45,[52,57,60,64,69]],F:[41,[53,57,60,65,69]],C:[36,[48,55,60,64,67]],E:[40,[52,56,59,64,68]],Dm:[38,[50,57,62,65,69]],E7:[40,[52,56,59,62,68]],D7:[38,[50,54,57,60,66]],B7:[47,[51,54,57,59,63]]},Gg={prairie:{bpm:86,swing:.14,sections:[{chords:[`D`,`D`,`G`,`D`,`Bm`,`G`,`A`,`A`],lead:null,tag:`intro`},{chords:[`D`,`D`,`G`,`D`,`Bm`,`G`,`A`,`A`],lead:`whistle`,mel:`A`},{chords:[`G`,`D`,`Em`,`A`,`D`,`G`,`A`,`D`],lead:`whistle`,mel:`B`,drums:!0},{chords:[`D`,`D`,`G`,`D`,`Bm`,`G`,`A`,`A`],lead:`guitar`,mel:`A`,drums:!0},{chords:[`Bm`,`G`,`D`,`A`,`Bm`,`G`,`A`,`A`],lead:null,tag:`break`,pad:!0}],mel:{A:[[[0,69,3],[3,74,1],[4,73,2],[6,71,2]],[[0,69,6]],[[0,71,3],[3,74,1],[4,76,2],[6,74,2]],[[0,69,6],[6,66,2]],[[0,71,3],[3,69,1],[4,66,2],[6,64,2]],[[0,62,2],[2,64,2],[4,67,4]],[[0,69,3],[3,71,1],[4,69,2],[6,64,2]],[[0,64,6]]],B:[[[0,74,2],[2,76,2],[4,78,4]],[[0,76,3],[3,74,1],[4,69,4]],[[0,71,2],[2,74,2],[4,76,3],[7,74,1]],[[0,73,6],[6,69,2]],[[0,74,3],[3,73,1],[4,71,2],[6,69,2]],[[0,67,2],[2,71,2],[4,74,4]],[[0,73,2],[2,71,2],[4,69,2],[6,73,2]],[[0,74,8]]]}},night:{bpm:64,swing:.08,sections:[{chords:[`Am`,`F`,`C`,`E`,`Am`,`Dm`,`E`,`E`],lead:`harmonica`,mel:`A`,pad:!0},{chords:[`Am`,`F`,`C`,`E`,`Am`,`Dm`,`E`,`E`],lead:`theremin`,mel:`A`,pad:!0,up:12},{chords:[`F`,`C`,`Dm`,`Am`,`F`,`C`,`E`,`E`],lead:null,pad:!0}],mel:{A:[[[0,76,4],[4,74,2],[6,72,2]],[[0,69,6],[6,72,2]],[[0,72,3],[3,74,1],[4,76,4]],[[0,71,6],[6,68,2]],[[0,69,2],[2,72,2],[4,76,4]],[[0,77,3],[3,76,1],[4,74,4]],[[0,71,2],[2,74,2],[4,72,2],[6,71,2]],[[0,68,8]]]}},town:{bpm:112,swing:.2,style:`rag`,sections:[{chords:[`G`,`G`,`E7`,`E7`,`A7`,`D7`,`G`,`D7`],lead:`piano`,mel:`A`,drums:!0},{chords:[`G`,`G`,`E7`,`E7`,`A7`,`D7`,`G`,`D7`],lead:`piano`,mel:`A`,drums:!0,up:12},{chords:[`C`,`C`,`G`,`E7`,`A7`,`D7`,`G`,`G`],lead:`piano`,mel:`B`,drums:!0}],mel:{A:[[[0,79,1],[1,78,1],[2,79,1],[3,74,2],[5,71,1],[6,74,2]],[[0,76,1],[1,74,1],[2,71,1],[3,67,3],[6,71,1],[7,74,1]],[[0,80,1],[1,79,1],[2,80,1],[3,76,2],[5,74,1],[6,71,2]],[[0,74,2],[2,76,1],[3,80,3],[6,83,2]],[[0,81,1],[1,79,1],[2,76,1],[3,73,2],[5,76,1],[6,79,2]],[[0,78,1],[1,76,1],[2,74,1],[3,72,2],[5,69,1],[6,66,2]],[[0,67,1],[1,71,1],[2,74,1],[3,79,3],[6,78,1],[7,79,1]],[[0,81,2],[2,78,2],[4,74,2],[6,72,2]]],B:[[[0,76,1],[1,79,1],[2,84,2],[4,83,1],[5,84,1],[6,79,2]],[[0,76,2],[2,72,2],[4,76,1],[5,79,3]],[[0,79,1],[1,83,1],[2,86,2],[4,83,2],[6,79,2]],[[0,80,3],[3,83,1],[4,80,2],[6,76,2]],[[0,76,1],[1,79,1],[2,81,2],[4,79,1],[5,76,1],[6,73,2]],[[0,74,1],[1,78,1],[2,81,2],[4,78,2],[6,72,2]],[[0,71,1],[1,74,1],[2,79,3],[5,74,1],[6,71,2]],[[0,67,4]]]}},flight:{bpm:108,swing:0,style:`drive`,sections:[{chords:[`Em`,`C`,`D`,`B7`,`Em`,`C`,`D`,`B7`],lead:`twang`,mel:`A`,drums:!0,pad:!0},{chords:[`Em`,`G`,`Am`,`B7`,`Em`,`G`,`Am`,`B7`],lead:`twang`,mel:`B`,drums:!0,pad:!0,ther:!0},{chords:[`C`,`D`,`Em`,`Em`,`C`,`D`,`B7`,`B7`],lead:`theremin`,mel:`A`,drums:!0,pad:!0,up:12}],mel:{A:[[[0,76,3],[3,74,1],[4,71,4]],[[0,72,2],[2,71,2],[4,67,4]],[[0,69,3],[3,71,1],[4,74,2],[6,78,2]],[[0,75,6],[6,71,2]],[[0,76,3],[3,74,1],[4,71,4]],[[0,72,2],[2,76,2],[4,79,4]],[[0,78,3],[3,76,1],[4,74,2],[6,71,2]],[[0,71,8]]],B:[[[0,76,2],[2,79,2],[4,83,4]],[[0,81,2],[2,79,2],[4,74,4]],[[0,76,3],[3,74,1],[4,72,2],[6,71,2]],[[0,71,6],[6,75,2]],[[0,76,2],[2,79,2],[4,83,4]],[[0,86,2],[2,83,2],[4,79,4]],[[0,81,3],[3,79,1],[4,76,2],[6,72,2]],[[0,71,8]]]}}},Kg=class{constructor(e){this.a=e;let t=e.ctx;this.ctx=t,this.out=t.createGain(),this.out.gain.value=.9;let n=t.createConvolver(),r=Math.floor(t.sampleRate*2.6),i=t.createBuffer(2,r,t.sampleRate);for(let e=0;e<2;e++){let t=i.getChannelData(e);for(let e=0;e<r;e++)t[e]=(Math.random()*2-1)*(1-e/r)**3.2*(e<200?e/200:1)}n.buffer=i,this.rev=t.createGain(),this.rev.gain.value=.32,this.rev.connect(n).connect(this.out),this.out.connect(e.music),this.buses={};for(let e of Object.keys(Gg)){let n=t.createGain();n.gain.value=0,n.connect(this.out);let r=t.createGain();r.gain.value=1,n.connect(r),r.connect(this.rev),this.buses[e]=n}this.theme=null,this.want=`prairie`,this.next=t.currentTime+.3,this.step=0,this.sec=0,this.pending=null,this.lastLead=null}setContext(e){this.want=e}env(e,t,n,r,i,a=`exp`){let o=this.ctx.createGain();return o.gain.setValueAtTime(1e-4,e),o.gain.linearRampToValueAtTime(n,e+t),a===`exp`?o.gain.exponentialRampToValueAtTime(1e-4,e+t+r):(o.gain.setValueAtTime(n,e+t+r*.7),o.gain.linearRampToValueAtTime(1e-4,e+t+r)),o.connect(i),o}osc(e,t,n,r,i){let a=this.ctx.createOscillator();return a.type=e,a.frequency.setValueAtTime(t,n),a.connect(i),a.start(n),a.stop(n+r+.1),a}pluck(e,t,n,r,i=3e3){let a=this.ctx.createBufferSource();a.buffer=this.a.pluckBuffer(Ug(t));let o=this.ctx.createBiquadFilter();o.type=`lowpass`,o.frequency.value=i;let s=this.ctx.createGain();s.gain.value=n,a.connect(o).connect(s).connect(r),a.start(e),a.stop(e+2.4)}bass(e,t,n,r,i){let a=this.env(e,.006,n,Math.min(r,.9),i),o=this.ctx.createBiquadFilter();o.type=`lowpass`,o.frequency.value=700,o.connect(a),this.osc(`sine`,Ug(t),e,r+.9,o),this.osc(`triangle`,Ug(t)*2,e,r+.9,this.env(e,.004,n*.25,.25,o))}whistle(e,t,n,r,i){let a=this.ctx,o=a.createOscillator();o.type=`sine`;let s=this.lastLead?Ug(this.lastLead):Ug(t);o.frequency.setValueAtTime(s,e),o.frequency.exponentialRampToValueAtTime(Ug(t),e+.07);let c=a.createOscillator();c.frequency.value=5.4;let l=a.createGain();l.gain.setValueAtTime(0,e),l.gain.linearRampToValueAtTime(Ug(t)*.018,e+Math.min(.35,r*.6)),c.connect(l).connect(o.frequency);let u=this.env(e,.05,n,r+.15,i,`lin`);o.connect(u);let d=a.createOscillator();d.type=`sine`,d.frequency.setValueAtTime(s*2,e),d.frequency.exponentialRampToValueAtTime(Ug(t)*2,e+.07);let f=a.createGain();f.gain.value=.08,d.connect(f).connect(u);let p=a.createBufferSource();p.buffer=this.a.noise;let m=a.createBiquadFilter();m.type=`bandpass`,m.frequency.value=Ug(t)*2,m.Q.value=3;let h=a.createGain();h.gain.value=.05,p.connect(m).connect(h).connect(u);for(let t of[o,d,c])t.start(e),t.stop(e+r+.3);p.start(e,Math.random()),p.stop(e+r+.3),this.lastLead=t}harmonica(e,t,n,r,i){let a=this.ctx,o=this.env(e,.06,n,r+.2,i,`lin`),s=a.createBiquadFilter();s.type=`bandpass`,s.frequency.value=1300,s.Q.value=.8;let c=a.createBiquadFilter();c.type=`lowpass`,c.frequency.value=2600,s.connect(c).connect(o);let l=a.createGain();l.gain.value=1;let u=a.createOscillator();u.frequency.value=6.2;let d=a.createGain();d.gain.value=.25,u.connect(d).connect(l.gain),l.connect(s);for(let[n,i]of[[`sawtooth`,-6],[`square`,5]]){let o=a.createOscillator();o.type=n,o.detune.value=i,o.frequency.setValueAtTime(Ug(t-1),e),o.frequency.exponentialRampToValueAtTime(Ug(t),e+.09);let s=a.createGain();s.gain.value=n===`square`?.3:.5,o.connect(s).connect(l),o.start(e),o.stop(e+r+.4)}u.start(e),u.stop(e+r+.4)}theremin(e,t,n,r,i){let a=this.ctx,o=a.createOscillator();o.type=`sine`;let s=this.lastLead?Ug(this.lastLead+12):Ug(t);o.frequency.setValueAtTime(s,e),o.frequency.exponentialRampToValueAtTime(Ug(t),e+.22);let c=a.createOscillator();c.frequency.value=6.5;let l=a.createGain();l.gain.value=Ug(t)*.03,c.connect(l).connect(o.frequency);let u=a.createWaveShaper(),d=new Float32Array(256);for(let e=0;e<256;e++){let t=e/128-1;d[e]=Math.tanh(t*1.6)}u.curve=d,o.connect(u).connect(this.env(e,.15,n,r+.3,i,`lin`)),o.start(e),c.start(e),o.stop(e+r+.5),c.stop(e+r+.5),this.lastLead=t}twang(e,t,n,r){let i=this.ctx.createGain();i.gain.value=.7;let a=this.ctx.createOscillator();a.frequency.value=7;let o=this.ctx.createGain();o.gain.value=.3,a.connect(o).connect(i.gain),a.start(e),a.stop(e+2.2),i.connect(r),this.pluck(e,t,n,i,4200),this.pluck(e+.004,t-12,n*.35,i,2400)}piano(e,t,n,r){let i=[[1,.6],[2,.28],[3,.12],[4,.06]],a=1.4-(t-60)*.015;for(let o of[-5,6])for(let[s,c]of i){let i=this.ctx.createOscillator();i.type=`sine`,i.frequency.value=Ug(t)*s,i.detune.value=o,i.connect(this.env(e,.004,n*c*.5,a/s,r)),i.start(e),i.stop(e+a+.1)}this.hit(e,2500,.03,n*.25,`bandpass`,r)}pad(e,t,n,r,i){let a=this.ctx.createBiquadFilter();a.type=`lowpass`,a.frequency.value=900,a.Q.value=.5;let o=this.ctx.createGain();o.gain.setValueAtTime(1e-4,e),o.gain.linearRampToValueAtTime(n,e+r*.35),o.gain.linearRampToValueAtTime(1e-4,e+r*1.1),a.connect(o).connect(i);for(let n of t)for(let t of[-9,8]){let i=this.ctx.createOscillator();i.type=`sawtooth`,i.frequency.value=Ug(n),i.detune.value=t;let o=this.ctx.createGain();o.gain.value=.12,i.connect(o).connect(a),i.start(e),i.stop(e+r*1.15)}}hit(e,t,n,r,i,a){let o=this.ctx.createBufferSource();o.buffer=this.a.noise;let s=this.ctx.createBiquadFilter();s.type=i,s.frequency.value=t,o.connect(s).connect(this.env(e,.002,r,n,a)),o.start(e,Math.random()),o.stop(e+n+.05)}kick(e,t,n){let r=this.ctx.createOscillator();r.type=`sine`,r.frequency.setValueAtTime(130,e),r.frequency.exponentialRampToValueAtTime(42,e+.12),r.connect(this.env(e,.002,t,.3,n)),r.start(e),r.stop(e+.4)}snare(e,t,n){this.hit(e,1900,.16,t,`bandpass`,n);let r=this.ctx.createOscillator();r.frequency.value=190,r.connect(this.env(e,.002,t*.4,.08,n)),r.start(e),r.stop(e+.15)}update(){let e=this.ctx.currentTime;this.theme!==this.want&&(this.step%8==0||!this.theme)&&(this.theme&&this.buses[this.theme].gain.setTargetAtTime(0,e,1.2),this.theme=this.want,this.buses[this.theme].gain.setTargetAtTime(1,e,.8),this.step=0,this.sec=(this.theme,0),this.lastLead=null,this.next=Math.max(this.next,e+.05));let t=Gg[this.theme],n=60/t.bpm/2;for(;this.next<e+.25;){let e=t.sections[this.sec%t.sections.length],r=Math.floor(this.step/8),i=this.step%8,a=i%2?t.swing*n:0,o=this.next+a;this.play(t,e,r,i,o,n),this.next+=n,this.step++,this.step>=e.chords.length*8&&(this.step=0,this.sec++)}}play(e,t,n,r,i,a){let o=this.buses[this.theme],[s,c]=Wg[t.chords[n]],l=e.style;if(l===`rag`){if((r===0||r===4)&&this.piano(i,s+(r===4?7:0)-0,.5,o),r===2||r===6)for(let e of c.slice(1,4))this.piano(i,e+12,.22,o)}else if(l===`drive`)this.bass(i,s+(r===6?7:0),.34,a*.9,o),r===0&&this.pluck(i,c[0],.3,o,2e3);else if(r%2==0){let e=r===0||r===4?s:s+7;this.bass(i,e+12,.3,a*1.8,o),this.pluck(i,r%4==0?c[0]:c[1],.34,o)}else{let e=[2,3,4,3][(r>>1)%4];this.pluck(i,c[e],this.theme===`night`?.16:.2,o,this.theme===`night`?2e3:3400)}if(t.pad&&r===0&&this.pad(i,c.slice(1,5).map(e=>e+12),this.theme===`flight`?.08:.06,a*8,o),t.drums&&(l===`drive`?((r===0||r===4)&&this.kick(i,.5,o),(r===2||r===6)&&this.snare(i,.22,o),this.hit(i,7e3,.04,r%2?.05:.08,`highpass`,o),this.hit(i+a/2,7e3,.03,.035,`highpass`,o)):l===`rag`?(r===2||r===6)&&this.hit(i,3200,.12,.07,`highpass`,o):(r===0&&this.kick(i,.22,o),(r===2||r===6)&&this.hit(i,2600,.22,.06,`highpass`,o),r%2&&this.hit(i,8e3,.03,.025,`highpass`,o))),t.lead&&t.mel){let s=e.mel[t.mel][n%e.mel[t.mel].length];for(let[e,n,c]of s){if(e!==r)continue;let s=n+(t.up||0),l=c*a;t.lead===`whistle`?this.whistle(i,s,.13,l,o):t.lead===`harmonica`?this.harmonica(i,s,.12,l,o):t.lead===`theremin`?this.theremin(i,s,.1,l,o):t.lead===`guitar`?(this.pluck(i,s,.42,o,4500),this.pluck(i+.01,s-12,.15,o)):t.lead===`twang`?this.twang(i,s,.42,o):t.lead===`piano`&&(this.piano(i,s,.4,o),c>=2&&this.piano(i,s-12,.18,o))}t.ther&&r===0&&n%2==0&&this.theremin(i,c[3]+12,.05,a*7,o)}}},qg=e=>440*2**((e-69)/12),Jg=class{constructor(){this.ctx=null,this.musicOn=!0,this.vols={master:.8,music:.7,sfx:.9},this.listener={x:0,y:0,z:0}}init(){if(this.ctx){this.ctx.resume();return}let e=new(window.AudioContext||window.webkitAudioContext);this.ctx=e,this.master=e.createGain(),this.master.gain.value=this.vols.master;let t=e.createDynamicsCompressor();this.master.connect(t).connect(e.destination),this.sfx=e.createGain(),this.sfx.gain.value=this.vols.sfx,this.sfx.connect(this.master),this.music=e.createGain(),this.music.gain.value=this.musicOn?this.musicLevel:0,this.music.connect(this.master);let n=e.createDelay();n.delayTime.value=.23;let r=e.createGain();r.gain.value=.28;let i=e.createGain();i.gain.value=.35,this.musicIn=e.createGain(),this.musicIn.connect(this.music),this.musicIn.connect(n),n.connect(r).connect(n),n.connect(i).connect(this.music);let a=e.sampleRate*2;this.noise=e.createBuffer(1,a,e.sampleRate);let o=this.noise.getChannelData(0);for(let e=0;e<a;e++)o[e]=Math.random()*2-1;this.wind=this.loopNoise(380,.6,0),this.windHi=this.loopNoise(1400,1.2,0),this.river=this.loopNoise(900,.3,0,`lowpass`),this.beamHum=this.hum(110,0),this.saucer=this.hum(62,0),this.plucks=new Map,this.nextNote=e.currentTime+1,this.step16=0,this.birdT=3,this.cricketT=0,this.jet=this.loopNoise(700,.7,0,`bandpass`),this.jetHum=this.hum(90,0),this.soundtrack=new Kg(this)}loopNoise(e,t,n,r=`bandpass`){let i=this.ctx,a=i.createBufferSource();a.buffer=this.noise,a.loop=!0;let o=i.createBiquadFilter();o.type=r,o.frequency.value=e,o.Q.value=t;let s=i.createGain();return s.gain.value=n,a.connect(o).connect(s).connect(this.sfx),a.start(),{g:s,f:o}}hum(e,t){let n=this.ctx,r=n.createOscillator();r.type=`sine`,r.frequency.value=e;let i=n.createOscillator();i.type=`triangle`,i.frequency.value=e*2.01;let a=n.createOscillator();a.frequency.value=5;let o=n.createGain();o.gain.value=e*.04,a.connect(o),o.connect(r.frequency),o.connect(i.frequency);let s=n.createGain();s.gain.value=t;let c=n.createBiquadFilter();return c.type=`lowpass`,c.frequency.value=900,r.connect(c),i.connect(c),c.connect(s).connect(this.sfx),r.start(),i.start(),a.start(),{g:s,o1:r,o2:i}}vol(e,t=40){if(!e)return 1;let n=this.listener,r=Math.hypot(e.x-n.x,e.y-n.y,e.z-n.z);return Math.max(0,1-r/t)}env(e,t,n,r,i){let a=this.ctx.createGain();return a.gain.setValueAtTime(1e-4,t),a.gain.exponentialRampToValueAtTime(r,t+n),a.gain.exponentialRampToValueAtTime(1e-4,t+n+i),e.connect(a),a}tone(e,t,n,r,i,{at:a=0,filter:o=0,dest:s}={}){if(!this.ctx)return;let c=this.ctx,l=c.currentTime+a,u=c.createOscillator();u.type=e,u.frequency.setValueAtTime(t,l),n!==t&&u.frequency.exponentialRampToValueAtTime(Math.max(20,n),l+r);let d=u;if(o){let e=c.createBiquadFilter();e.type=`lowpass`,e.frequency.value=o,u.connect(e),d=e}this.env(d,l,.01,i,r).connect(s||this.sfx),u.start(l),u.stop(l+r+.05)}burst(e,t,n,{type:r=`lowpass`,q:i=1,at:a=0,f1:o}={}){if(!this.ctx)return;let s=this.ctx,c=s.currentTime+a,l=s.createBufferSource();l.buffer=this.noise;let u=s.createBiquadFilter();u.type=r,u.frequency.setValueAtTime(e,c),u.Q.value=i,o&&u.frequency.exponentialRampToValueAtTime(o,c+t),l.connect(u),this.env(u,c,.005,n,t).connect(this.sfx),l.start(c,Math.random()),l.stop(c+t+.05)}pluckBuffer(e){let t=Math.round(e*10);if(this.plucks.has(t))return this.plucks.get(t);let n=this.ctx.sampleRate,r=Math.floor(n*2.4),i=this.ctx.createBuffer(1,r,n),a=i.getChannelData(0),o=Math.max(2,Math.round(n/e)),s=new Float32Array(o);for(let e=0;e<o;e++)s[e]=(Math.random()*2-1)*(.5+.5*Math.sin(e/o*Math.PI));let c=0,l=0;for(let e=0;e<r;e++){let t=s[c],n=.498*(t+l);l=t,s[c]=n,a[e]=t,c=(c+1)%o}return this.plucks.set(t,i),i}pluck(e,t=.3,n=0,r){if(!this.ctx)return;let i=this.ctx.currentTime+n,a=this.ctx.createBufferSource();a.buffer=this.pluckBuffer(qg(e));let o=this.ctx.createGain();o.gain.value=t;let s=this.ctx.createBiquadFilter();s.type=`lowpass`,s.frequency.value=3200,a.connect(s).connect(o).connect(r||this.sfx),a.start(i)}step(e){this.burst(e?900:650,.07,e?.12:.08,{f1:300})}jump(){this.burst(600,.18,.06,{type:`bandpass`,f1:1400})}land(){this.tone(`sine`,110,50,.2,.3),this.burst(400,.15,.15)}splash(){this.burst(1200,.5,.25,{f1:300})}hoof(e){this.burst(380,.06,.14+Math.min(.1,e*.005),{f1:150}),this.tone(`sine`,140,70,.07,.12)}whoosh(){this.burst(400,.35,.2,{type:`bandpass`,q:2,f1:2200})}laser(){this.tone(`sawtooth`,2200,180,.22,.14,{filter:4e3}),this.tone(`square`,1100,90,.18,.06),this.burst(3e3,.08,.1,{type:`highpass`})}ping(){this.tone(`triangle`,1760,1500,.35,.18),this.tone(`sine`,2640,2400,.25,.08)}moo(e,t=1){if(!this.ctx)return;let n=this.vol(e,45)*.35;if(n<=.01)return;let r=this.ctx,i=r.currentTime,a=r.createOscillator();a.type=`sawtooth`;let o=118*t*(.9+Math.random()*.2);a.frequency.setValueAtTime(o*.9,i),a.frequency.linearRampToValueAtTime(o*1.12,i+.25),a.frequency.linearRampToValueAtTime(o*.78,i+1.1);let s=r.createBiquadFilter();s.type=`lowpass`,s.frequency.setValueAtTime(350,i),s.frequency.linearRampToValueAtTime(900,i+.3),s.frequency.linearRampToValueAtTime(300,i+1.1),s.Q.value=6,a.connect(s);let c=r.createGain();c.gain.setValueAtTime(1e-4,i),c.gain.linearRampToValueAtTime(n,i+.15),c.gain.linearRampToValueAtTime(n*.8,i+.8),c.gain.linearRampToValueAtTime(1e-4,i+1.2),s.connect(c).connect(this.sfx),a.start(i),a.stop(i+1.3)}bark(e){let t=this.vol(e,40)*.25;if(!(t<.01))for(let e of[0,.22])this.tone(`square`,520,260,.1,t,{at:e,filter:1400}),this.burst(900,.08,t*.6,{at:e,type:`bandpass`,q:3})}neigh(){if(!this.ctx)return;let e=this.ctx,t=e.currentTime,n=e.createOscillator();n.type=`sawtooth`,n.frequency.setValueAtTime(900,t),n.frequency.exponentialRampToValueAtTime(420,t+.9);let r=e.createOscillator();r.frequency.value=22;let i=e.createGain();i.gain.value=80,r.connect(i).connect(n.frequency);let a=e.createBiquadFilter();a.type=`bandpass`,a.frequency.value=1200,a.Q.value=2,n.connect(a),this.env(a,t,.05,.25,.9).connect(this.sfx),n.start(t),r.start(t),n.stop(t+1),r.stop(t+1)}blip(e=1){this.tone(`triangle`,880*e,880*e,.12,.12)}chime(){[0,4,7,12].forEach((e,t)=>this.pluck(67+e,.35,t*.07))}questComplete(){[0,4,7,12,16].forEach((e,t)=>this.pluck(62+e,.4,t*.1)),this.tone(`sine`,1320,1320,1.2,.05,{at:.5})}levelUp(){[0,7,12,16,19,24].forEach((e,t)=>this.pluck(55+e,.45,t*.08)),this.tone(`triangle`,660,1320,.6,.08,{at:.4})}pickupGold(){[0,7,12].forEach((e,t)=>this.tone(`triangle`,qg(79+e),qg(79+e),.25,.12,{at:t*.06}))}pickupPart(){this.tone(`sine`,300,1600,.8,.15),[0,5,12,17].forEach((e,t)=>this.tone(`triangle`,qg(76+e),qg(76+e),.5,.1,{at:.1+t*.09}))}repair(){this.tone(`sawtooth`,80,800,4,.08,{filter:1500}),this.tone(`sine`,200,1200,4,.1)}fail(){[0,-3,-7].forEach((e,t)=>this.pluck(60+e,.35,t*.14))}beamStart(){this.tone(`sine`,200,900,.4,.12)}beamLevel(e){this.beamHum&&this.beamHum.g.gain.setTargetAtTime(e*.12,this.ctx.currentTime,.08)}saucerHum(e){this.saucer&&this.saucer.g.gain.setTargetAtTime(e?.14:0,this.ctx.currentTime,.3)}saucerSpeed(e){if(!this.saucer)return;let t=this.ctx.currentTime;this.saucer.o1.frequency.setTargetAtTime(62+e*60,t,.2),this.saucer.o2.frequency.setTargetAtTime((62+e*60)*2.01,t,.2)}jetpack(e){if(!this.jet)return;let t=this.ctx.currentTime;this.jet.g.gain.setTargetAtTime(e*.22,t,.06),this.jet.f.frequency.setTargetAtTime(500+e*900,t,.1),this.jetHum.g.gain.setTargetAtTime(e*.06,t,.1)}get musicLevel(){return .6*this.vols.music}setVolumes(e){if(this.vols={...e},!this.ctx)return;let t=this.ctx.currentTime;this.master.gain.setTargetAtTime(e.master,t,.05),this.sfx.gain.setTargetAtTime(e.sfx,t,.05),this.music.gain.setTargetAtTime(this.musicOn?this.musicLevel:0,t,.05)}incoming(){this.ctx&&(this.tone(`sawtooth`,1400,180,5.6,.07,{filter:2400}),this.tone(`sine`,900,120,5.8,.12),this.burst(800,5.6,.1,{type:`bandpass`,q:.8,f1:200}))}boom(){if(this.ctx){this.tone(`sine`,90,28,1.6,.9),this.burst(600,2.2,.8,{f1:60}),this.burst(3e3,.4,.3,{type:`highpass`});for(let e=0;e<6;e++)this.burst(400+Math.random()*900,.5,.15,{at:.3+Math.random()*1.5,f1:150})}}setMusic(e){this.musicOn=e,this.music&&this.music.gain.setTargetAtTime(e?this.musicLevel:0,this.ctx.currentTime,.5)}update(e,{listener:t,night:n,windiness:r=1,riverDist:i=999,indoors:a=!1,theme:o}){if(this.soundtrack&&o&&this.soundtrack.setContext(o),!this.ctx)return;this.listener=t;let s=this.ctx.currentTime,c=.5+.5*Math.sin(s*.13)*Math.sin(s*.07+1);if(this.wind.g.gain.setTargetAtTime((.05+c*.08)*r,s,.5),this.windHi.g.gain.setTargetAtTime((.01+c*.025)*r,s,.5),this.wind.f.frequency.setTargetAtTime(300+c*250,s,.5),this.river.g.gain.setTargetAtTime(Math.max(0,1-i/40)*.12,s,.5),this.birdT-=e,this.birdT<0&&(this.birdT=3+Math.random()*7,n<.3)){let e=2400+Math.random()*1600,t=2+Math.floor(Math.random()*3);for(let n=0;n<t;n++)this.tone(`sine`,e,e*(1.2+Math.random()*.3),.09,.025,{at:n*.13})}if(this.cricketT-=e,n>.5&&this.cricketT<0){this.cricketT=.5+Math.random()*.6;for(let e=0;e<3;e++)this.tone(`sine`,4300+Math.random()*200,4300,.03,.012*n,{at:e*.05})}this.soundtrack&&this.musicOn&&this.soundtrack.update()}},Yg=class{constructor(e){this.dom=e,this.keys=new Set,this.pressed=new Set,this.mouse={dx:0,dy:0,wheel:0,left:!1,right:!1,clicked:!1,rclicked:!1},this.locked=!1,this.enabled=!0,window.addEventListener(`keydown`,e=>{if(e.repeat){e.code===`Tab`&&e.preventDefault();return}(e.code===`Tab`||e.code===`Space`)&&e.preventDefault(),this.keys.add(e.code),this.pressed.add(e.code)}),window.addEventListener(`keyup`,e=>this.keys.delete(e.code)),window.addEventListener(`blur`,()=>this.keys.clear()),e.addEventListener(`mousedown`,e=>{e.button===0&&(this.mouse.left=!0,this.mouse.clicked=!0),e.button===2&&(this.mouse.right=!0,this.mouse.rclicked=!0)}),window.addEventListener(`mouseup`,e=>{e.button===0&&(this.mouse.left=!1),e.button===2&&(this.mouse.right=!1)}),e.addEventListener(`contextmenu`,e=>e.preventDefault()),window.addEventListener(`mousemove`,e=>{this.locked&&(this.mouse.dx+=e.movementX,this.mouse.dy+=e.movementY)}),window.addEventListener(`wheel`,e=>{this.mouse.wheel+=Math.sign(e.deltaY)},{passive:!0}),document.addEventListener(`pointerlockchange`,()=>{this.locked=document.pointerLockElement===e})}lock(){this.locked||Xg(this.dom)}down(e){return this.enabled&&this.keys.has(e)}hit(e){return this.enabled&&this.pressed.has(e)}endFrame(){this.pressed.clear(),this.mouse.dx=0,this.mouse.dy=0,this.mouse.wheel=0,this.mouse.clicked=!1,this.mouse.rclicked=!1}};function Xg(e){try{let t=e.requestPointerLock({unadjustedMovement:!0});t&&t.catch&&t.catch(()=>e.requestPointerLock())}catch{e.requestPointerLock()}}var $=e=>document.querySelector(e),Zg=(e,t,n)=>{let r=document.createElement(e);return t&&(r.className=t),n!=null&&(r.innerHTML=n),r},Qg=class{constructor(e){this.game=e,this.root=$(`#ui`),this.root.innerHTML=`
      <div id="hud" class="hidden">
        <div id="badge"><div class="lvl"><span>LV</span><b id="lvl">1</b></div>
          <div class="bars"><div class="xpbar"><i id="xpfill"></i></div><div class="row"><span id="money">$0</span><span id="sp"></span></div></div></div>
        <div id="compass"><div id="compass-strip"></div><div class="notch"></div><div id="clock"></div></div>
        <div id="tracker"></div>
        <div id="toasts"></div>
        <div id="banner"></div>
        <div id="prompt"></div>
        <div id="hint"></div>
        <div id="meters"><div class="meter" id="stam"><i></i></div><div class="meter hover" id="hov"><i></i></div></div>
        <div id="crosshair"></div>
        <div id="rangebox" class="hidden"><b id="rtime">20.0</b><span id="rhits">0/8</span></div>
        <div id="rodeo" class="hidden"><div class="label">STAY ON!  [A] ◀ ▶ [D]</div><div class="track"><div class="safe"></div><div id="needle"></div></div><div class="prog"><i id="rprog"></i></div></div>
        <div id="labels"></div>
      </div>
      <div id="dialog" class="hidden"><div class="name" id="dname"></div><div class="title" id="dtitle"></div><div class="text" id="dtext"></div><div class="choices" id="dchoices"></div><div class="more">[E] / click</div></div>
      <div id="journal" class="hidden">
        <div class="paper">
          <div class="tabs"><button data-tab="quests">Quests</button><button data-tab="skills">Skills</button><button data-tab="wardrobe">Wardrobe</button><button data-tab="map">Map</button></div>
          <div class="body" id="jbody"></div>
          <div class="foot">[Tab] close · [M] map</div>
        </div>
      </div>
      <div id="pause" class="hidden"><div class="paper small">
        <h2>Takin' a Breather</h2>
        <button id="resume">Resume</button>
        <button id="p-settings" class="ghost">Settings</button>
        <button id="p-quit" class="ghost">Save &amp; Quit to Title</button>
        <div class="controls">
          <div><kbd>WASD</kbd> Move</div><div><kbd>Shift</kbd> Sprint / Gallop / Boost</div><div><kbd>Space</kbd> Jump · hold in air: jetpack</div>
          <div><kbd>E</kbd> Talk / Interact / Mount</div><div><kbd>F</kbd> Lasso</div><div><kbd>Q</kbd> Tractor beam (hold)</div>
          <div><kbd>RMB</kbd> Aim · <kbd>LMB</kbd> Shoot</div><div><kbd>H</kbd> Whistle for horse</div><div><kbd>Tab</kbd> Journal · <kbd>M</kbd> Map</div>
          <div><kbd>C</kbd> Descend (flying)</div><div><kbd>Wheel</kbd> Zoom</div><div><kbd>N</kbd> Music on/off</div>
        </div>
        <button id="newgame" class="danger">Start Over</button>
      </div></div>
      <div id="settings" class="hidden"><div class="paper small"><h2>Settings</h2><div id="set-body"></div><button id="set-back">Done</button></div></div>
      <div id="credits" class="hidden"><div class="paper small credits">
        <h2>Credits</h2>
        <p class="c-lead">Alien Frontier grew out of a daydream a twelve-year-old had about an alien who crash-lands in the Midwest and wants nothing more than to be a cowboy.</p>
        <div class="c-grid">
          <span>Original dream</span><b>Lucas</b>
          <span>Built with</span><b>Claude Code &amp; three.js</b>
          <span>Art, audio &amp; music</span><b>100% procedural, made in code</b>
          <span>Fonts</span><b>Rye &amp; Alegreya Sans (Google Fonts)</b>
        </div>
        <p class="muted">No cows were permanently abducted in the making of this game.</p>
        <button id="cred-back">Back</button>
      </div></div>
      <div id="title">
        <div class="t-shade"></div>
        <div class="t-left">
          <div class="t-eyebrow">A Space Western</div>
          <h1 class="t-logo"><span class="l1">Alien</span><span class="l2">Frontier</span></h1>
          <div class="t-rule"><i></i><em>&#10022;</em><i></i></div>
          <div class="t-tag">A stranger. A saddle. A whole lot of nowhere.</div>
          <nav class="t-menu">
            <button id="continue" class="hidden"><b>Continue</b><small id="cont-meta"></small></button>
            <button id="play"><b>New Game</b><small>Somewhere in the Midwest, 1887</small></button>
            <button id="t-settings"><b>Settings</b></button>
            <button id="t-credits"><b>Credits</b></button>
          </nav>
          <div class="t-foot">Keyboard &amp; mouse · Headphones recommended</div>
        </div>
        <div class="t-sound" id="t-sound">&#9835; Click anywhere to wake the prairie</div>
        <div class="t-version">v1.0</div>
      </div>
      <div id="cine" class="hidden"><div class="bar top"></div><div class="bar bot"></div><div class="cap" id="cine-cap"></div><div class="skip">Hold <kbd>Space</kbd> to skip</div><div class="skipbar"><i id="cine-skip"></i></div></div>
      <div id="ending" class="hidden"><div class="e-inner">
        <div class="e-top">Phone Home: complete</div>
        <h1>The End</h1><div class="e-sub">…of the beginning.</div>
        <p>Zeke fixed his saucer, but somewhere between the saloon, the ranch and the lake, the sky stopped feeling like home. The frontier did.</p>
        <div class="e-stats" id="e-stats"></div>
        <button id="e-continue">Keep Exploring</button>
      </div></div>
      <div id="fps" class="hidden"></div>
      <div id="fade"></div>`,this.el={hud:$(`#hud`),lvl:$(`#lvl`),xp:$(`#xpfill`),money:$(`#money`),sp:$(`#sp`),strip:$(`#compass-strip`),clock:$(`#clock`),tracker:$(`#tracker`),toasts:$(`#toasts`),banner:$(`#banner`),prompt:$(`#prompt`),hint:$(`#hint`),stam:$(`#stam`),hov:$(`#hov`),cross:$(`#crosshair`),dialog:$(`#dialog`),dname:$(`#dname`),dtitle:$(`#dtitle`),dtext:$(`#dtext`),dchoices:$(`#dchoices`),journal:$(`#journal`),jbody:$(`#jbody`),pause:$(`#pause`),title:$(`#title`),labels:$(`#labels`),rangebox:$(`#rangebox`),rtime:$(`#rtime`),rhits:$(`#rhits`),rodeo:$(`#rodeo`),needle:$(`#needle`),rprog:$(`#rprog`),fade:$(`#fade`)},this.tab=`quests`,this.hintT=0,this.dialogState=null,this.labelEls=new Map,this.root.querySelectorAll(`.tabs button`).forEach(e=>e.addEventListener(`click`,()=>{this.tab=e.dataset.tab,this.renderJournal()})),$(`#resume`).addEventListener(`click`,()=>e.resume());let t=e=>{this.settingsFrom=e,this.renderSettings(),$(`#settings`).classList.remove(`hidden`)};$(`#p-settings`).addEventListener(`click`,()=>{$(`#pause`).classList.add(`hidden`),t(`pause`)}),$(`#t-settings`).addEventListener(`click`,()=>t(`title`)),$(`#set-back`).addEventListener(`click`,()=>{$(`#settings`).classList.add(`hidden`),this.settingsFrom===`pause`&&$(`#pause`).classList.remove(`hidden`)}),$(`#t-credits`).addEventListener(`click`,()=>$(`#credits`).classList.remove(`hidden`)),$(`#cred-back`).addEventListener(`click`,()=>$(`#credits`).classList.add(`hidden`)),$(`#p-quit`).addEventListener(`click`,()=>e.quitToTitle()),$(`#e-continue`).addEventListener(`click`,()=>{$(`#ending`).classList.add(`hidden`),e.resume()}),this.root.querySelectorAll(`.t-menu button`).forEach(t=>t.addEventListener(`mouseenter`,()=>e.audio.blip?.(1.2))),$(`#newgame`).addEventListener(`click`,()=>{this.confirmNew?e.newGame():(this.confirmNew=!0,$(`#newgame`).textContent=`Really? Click again`)}),this.el.dialog.addEventListener(`click`,e=>{e.target.closest(`button`)||this.advanceDialog()})}showTitle(e){if(e){$(`#continue`).classList.remove(`hidden`);let t=e.progress||{},n=(t.parts||[]).length;$(`#cont-meta`).textContent=`Level ${t.level||1} · $${t.money||0} · ${n}/6 ship parts`}}soundReady(){$(`#t-sound`).classList.add(`gone`)}renderSettings(){let e=this.game,t=e.settings,n=(e,n,r,i,a,o)=>`<label class="set-row"><span>${n}</span><input type="range" data-k="${e}" min="${r}" max="${i}" step="${a}" value="${t[e]}"><em>${o(t[e])}</em></label>`,r=e=>`${Math.round(e*100)}%`;$(`#set-body`).innerHTML=`
      <h3>Sound</h3>
      ${n(`master`,`Master volume`,0,1,.05,r)}
      ${n(`music`,`Music`,0,1,.05,r)}
      ${n(`sfx`,`Effects`,0,1,.05,r)}
      <h3>Controls</h3>
      ${n(`sensitivity`,`Mouse sensitivity`,.3,2.5,.05,e=>`${(+e).toFixed(2)}×`)}
      <label class="set-row"><span>Invert mouse Y</span><input type="checkbox" data-k="invertY" ${t.invertY?`checked`:``}><em></em></label>
      <h3>Graphics</h3>
      <div class="set-row"><span>Quality</span><div class="seg">${[`auto`,`low`,`medium`,`high`].map(e=>`<button data-q="${e}" class="${t.quality===e?`on`:``}">${e[0].toUpperCase()+e.slice(1)}</button>`).join(``)}</div><em></em></div>
      <p class="muted set-note">${t.quality===`auto`?`Auto adjusts to your graphics card. Now: <b>${e.tierName}</b>`:`Fixed: <b>${e.tierName}</b>`} <small>(${e.gpu.renderer.replace(/ANGLE \(|\)$/g,``).slice(0,60)})</small></p>
      <label class="set-row"><span>Show FPS</span><input type="checkbox" data-k="showFps" ${t.showFps?`checked`:``}><em></em></label>`,$(`#set-body`).querySelectorAll(`input[type=range]`).forEach(n=>n.addEventListener(`input`,()=>{let r=n.dataset.k;t[r]=parseFloat(n.value),n.nextElementSibling.textContent=r===`sensitivity`?`${t[r].toFixed(2)}×`:`${Math.round(t[r]*100)}%`,e.applySettings()})),$(`#set-body`).querySelectorAll(`input[type=checkbox]`).forEach(n=>n.addEventListener(`change`,()=>{t[n.dataset.k]=n.checked,e.applySettings()})),$(`#set-body`).querySelectorAll(`.seg button`).forEach(n=>n.addEventListener(`click`,()=>{t.quality=n.dataset.q,e.applySettings(),this.renderSettings()}))}get overlayOpen(){return!$(`#settings`).classList.contains(`hidden`)||!$(`#credits`).classList.contains(`hidden`)||!$(`#ending`).classList.contains(`hidden`)}cinematic(e){$(`#cine`).classList.toggle(`hidden`,!e),$(`#hud`).classList.toggle(`cine-hide`,e)}cineCaption(e){let t=$(`#cine-cap`);t.textContent!==e&&(t.classList.remove(`show`),t.offsetWidth,t.innerHTML=e,e&&t.classList.add(`show`))}cineSkip(e){$(`#cine-skip`).style.width=`${e*100}%`}showEnding(e){$(`#e-stats`).innerHTML=e.map(([e,t])=>`<span>${e}<b>${t}</b></span>`).join(``),$(`#ending`).classList.remove(`hidden`)}fps(e){let t=$(`#fps`);t.classList.toggle(`hidden`,e==null),e!=null&&(t.textContent=typeof e==`number`?`${e} fps`:e)}hideTitle(){this.el.title.classList.add(`gone`),this.el.hud.classList.remove(`hidden`),setTimeout(()=>this.el.title.classList.add(`hidden`),1400)}fade(e){this.el.fade.classList.toggle(`on`,e)}refresh(){let e=this.game.progress;this.el.lvl.textContent=e.level,this.el.xp.style.width=`${e.xp/e.xpFor(e.level)*100}%`,this.el.money.textContent=`$${e.money}`,this.el.sp.textContent=e.sp>0?`${e.sp} skill point${e.sp>1?`s`:``} · Tab`:``,this.el.sp.classList.toggle(`glow`,e.sp>0);let t=this.game.quests,n=t.tracked&&!t.done(t.tracked)?t.tracked:t.active()[0];n?(this.el.tracker.innerHTML=`<div class="qt">${Cg[n].title}</div><div class="qo">${t.stageText(n)}</div>`+t.active().filter(e=>e!==n).slice(0,3).map(e=>`<div class="qx">${Cg[e].title}</div>`).join(``),this.el.tracker.classList.remove(`hidden`)):this.el.tracker.classList.add(`hidden`),this.el.journal.classList.contains(`hidden`)||this.renderJournal()}toast(e,t,n=``){let r=Zg(`div`,`toast ${n}`,`<b>${e}</b>${t?`<span>${t}</span>`:``}`);for(this.el.toasts.prepend(r);this.el.toasts.children.length>5;)this.el.toasts.lastChild.remove();setTimeout(()=>r.classList.add(`out`),4200),setTimeout(()=>r.remove(),5e3)}questBanner(e,t){let n=this.el.banner;n.innerHTML=`<small>${e}</small><div>${t}</div>`,n.classList.remove(`show`),n.offsetWidth,n.classList.add(`show`)}levelUp(e){this.questBanner(`Level up`,`Level ${e}  ·  +1 skill point`)}hint(e,t=5){this.el.hint.textContent=e,this.el.hint.classList.add(`show`),this.hintT=t}prompt(e){this._prompt!==e&&(this._prompt=e,this.el.prompt.innerHTML=e?e.replace(/\[(\w+)\]/g,`<kbd>$1</kbd>`):``,this.el.prompt.classList.toggle(`show`,!!e))}openDialog(e,t){this.dialogState={npc:e,pages:[...t],i:-1},this.el.dialog.classList.remove(`hidden`),this.el.dname.textContent=e.name,this.el.dtitle.textContent=e.def?.title||``,this.game.setTalking(e,!0),this.advanceDialog()}advanceDialog(){let e=this.dialogState;if(!e)return;if(e.typing){e.typing=!1,this.el.dtext.textContent=e.full;return}if(e.awaitChoice)return;for(e.i+=1;e.i<e.pages.length&&e.pages[e.i].end;)e.pages[e.i].end(),e.i+=1;if(e.i>=e.pages.length)return this.closeDialog();let t=e.pages[e.i];this.typeText(t.text),this.el.dchoices.innerHTML=``,e.awaitChoice=!!t.choices,t.choices&&t.choices.forEach((e,t)=>{let n=Zg(`button`,``,`<kbd>${t+1}</kbd> ${e.label}`);n.addEventListener(`click`,()=>this.choose(t)),this.el.dchoices.appendChild(n)}),this.game.audio.blip(.9+Math.random()*.3)}choose(e){let t=this.dialogState;if(!t||!t.awaitChoice)return;let n=t.pages[t.i].choices[e];if(!n)return;t.awaitChoice=!1,t.typing=!1,this.game.player?.rig.say(1.1);let r=typeof n.then==`function`?n.then():n.then;if(r===null){this.closeDialog();return}r&&t.pages.splice(t.i+1,0,...r),this.advanceDialog()}typeText(e){let t=this.dialogState;t.full=e,t.typing=!0;let n=0,r=this.el.dtext;r.textContent=``;let i=()=>{if(t.typing&&this.dialogState===t){if(n+=2,r.textContent=e.slice(0,n),n>=e.length){t.typing=!1;return}setTimeout(i,16)}};i()}closeDialog(){let e=this.dialogState;this.dialogState=null,this.el.dialog.classList.add(`hidden`),e&&this.game.setTalking(e.npc,!1)}get inDialog(){return!!this.dialogState}openJournal(e){e&&(this.tab=e),document.exitPointerLock?.(),this.el.journal.classList.remove(`hidden`),this.confirmNew=!1,this.renderJournal()}closeJournal(){this.el.journal.classList.add(`hidden`)}get journalOpen(){return!this.el.journal.classList.contains(`hidden`)}renderJournal(){this.root.querySelectorAll(`.tabs button`).forEach(e=>e.classList.toggle(`on`,e.dataset.tab===this.tab));let e=this.game,t=e.progress,n=e.quests,r=this.el.jbody;if(this.tab===`quests`){let e=n.active(),i=Object.keys(n.state).filter(e=>n.done(e));r.innerHTML=`<h2>Trail Journal</h2>`+(e.length?``:`<p class="muted">Nothing on your plate. Go explore, partner.</p>`)+e.map(e=>`<div class="quest ${n.tracked===e?`tracked`:``}" data-q="${e}"><div class="qh">${Cg[e].main?`<i>★</i>`:``}${Cg[e].title}</div><div class="qo">${n.stageText(e)}</div><div class="qtrack">${n.tracked===e?`Tracking`:`Click to track`}</div></div>`).join(``)+(i.length?`<h3>Done & dusted</h3>`+i.map(e=>`<div class="quest done">${Cg[e].title}</div>`).join(``):``)+`<h3>Ship parts <small>${t.parts.length}/6</small></h3><div class="parts">${Object.entries(kg).map(([e,n])=>`<span class="${t.parts.includes(e)?`got`:``}">${n}</span>`).join(``)}</div><h3>Tally</h3><div class="stats"><span>Gold nuggets <b>${t.nuggets}</b></span><span>Cows abducted <b>${t.stats.abducted}</b></span><span>Cans shot <b>${t.stats.cans}</b></span><span>Places found <b>${t.discovered.length}/${Object.keys(Y).length}</b></span></div>`,r.querySelectorAll(`.quest[data-q]`).forEach(e=>e.addEventListener(`click`,()=>{n.tracked=e.dataset.q,this.refresh()}))}else if(this.tab===`skills`)r.innerHTML=`<h2>Skills <small>${t.sp} point${t.sp===1?``:`s`} to spend</small></h2><div class="trees">`+[`Cowboy`,`Alien`].map(e=>`
        <div class="tree"><h3>${e===`Cowboy`?`Cowboy Ways`:`Alien Gifts`}</h3>${bg.filter(t=>t.tree===e).map(e=>{let n=t.skills[e.id],r=Array.from({length:e.max},(e,t)=>`<i class="${t<n?`on`:``}"></i>`).join(``),i=t.canUpgrade(e.id),a=n<e.max?e.ranks[n]:`Mastered`,o=n===0&&e.locked?`<div class="lock">${e.locked}</div>`:``;return`<div class="skill ${n?`has`:``}"><div class="sh"><b>${e.name}</b><span class="pips">${r}</span></div>
            <div class="sd">${n?e.ranks[n-1]:`<span class="muted">Not learned</span>`}</div>
            ${n<e.max?`<div class="sn">Next: ${a}</div>`:``}${o}
            ${i?`<button data-up="${e.id}">Learn (1 pt)</button>`:``}</div>`}).join(``)}</div>`).join(``)+`</div>`,r.querySelectorAll(`button[data-up]`).forEach(n=>n.addEventListener(`click`,()=>{t.upgrade(n.dataset.up),e.save()}));else if(this.tab===`wardrobe`){let n=e.npcs.otis&&e.npcs.otis.pos.distanceTo(e.player.pos)<8;r.innerHTML=`<h2>Wardrobe <small>$${t.money}</small></h2><p class="muted">${n?`Otis's hats, fresh off the wagon.`:`Visit Otis at the General Store in Dusty Gulch to buy new hats.`}</p><div class="hats">`+Object.entries(Xh).map(([e,r])=>{let i=t.hats.includes(e),a=t.hat===e&&t.hasHat,o=``;return o=i?a?`<span class="wearing">Wearing</span>`:`<button data-wear="${e}">Wear</button>`:n?`<button data-buy="${e}" ${t.money<r.price?`disabled`:``}>Buy $${r.price}</button>`:`<span class="muted">$${r.price}</span>`,`<div class="hat ${i?`own`:``}"><div class="swatch" style="--c:${r.color};--b:${r.band}"></div><b>${r.name}</b>${o}</div>`}).join(``)+`</div><h3>Outfits</h3><div class="hats">`+Object.entries(Zh).map(([e,r])=>{let i=(t.outfits||[]).includes(e),a=``;return a=i?t.outfit===e?`<span class="wearing">Wearing</span>`:`<button data-outfit="${e}">Wear</button>`:n?`<button data-buyout="${e}" ${t.money<r.price?`disabled`:``}>Buy $${r.price}</button>`:`<span class="muted">$${r.price} at Otis's</span>`,`<div class="hat ${i?`own`:``}"><div class="outfit-swatch o-${e}"></div><b>${r.name}</b>${a}</div>`}).join(``)+`</div>`,r.querySelectorAll(`button[data-outfit]`).forEach(t=>t.addEventListener(`click`,()=>{e.wearOutfit(t.dataset.outfit),this.renderJournal()})),r.querySelectorAll(`button[data-buyout]`).forEach(n=>n.addEventListener(`click`,()=>{let r=n.dataset.buyout;t.money<Zh[r].price||(t.addMoney(-Zh[r].price,Zh[r].name),t.outfits=[...t.outfits||[],r],e.wearOutfit(r),e.audio.chime(),this.renderJournal())})),r.querySelectorAll(`button[data-wear]`).forEach(t=>t.addEventListener(`click`,()=>{e.wearHat(t.dataset.wear),this.renderJournal()})),r.querySelectorAll(`button[data-buy]`).forEach(n=>n.addEventListener(`click`,()=>{let r=n.dataset.buy;t.money<Xh[r].price||(t.addMoney(-Xh[r].price,Xh[r].name),t.hats.push(r),e.wearHat(r),e.audio.chime(),e.save(),this.renderJournal())}))}else this.tab===`map`&&(r.innerHTML=`<h2>Map of the County</h2><div class="mapwrap"><canvas id="mapc" width="620" height="620"></canvas></div>`,this.drawMap($(`#mapc`)))}buildMapImage(){if(this.mapImg)return this.mapImg;let e=this.game.terrainMesh.geometry.attributes.color.array,t=document.createElement(`canvas`);t.width=281,t.height=281;let n=t.getContext(`2d`),r=n.createImageData(281,281);for(let t=0;t<281;t++)for(let n=0;n<281;n++){let i=t*281+n,a=uf[t*281+Math.max(0,n-1)],o=uf[Math.max(0,t-1)*281+n],s=Math.max(.55,Math.min(1.35,1+(uf[i]-a)*.06+(uf[i]-o)*.06)),c=e=>e**(1/2.2)*255*s,l=uf[i]<.5;r.data[i*4]=l?70:c(e[i*3]),r.data[i*4+1]=l?140:c(e[i*3+1]),r.data[i*4+2]=l?160:c(e[i*3+2]),r.data[i*4+3]=255}return n.putImageData(r,0,0),this.mapImg=t,t}drawMap(e){let t=e.getContext(`2d`),n=e.width;t.imageSmoothingEnabled=!0,t.drawImage(this.buildMapImage(),0,0,n,n),t.fillStyle=`rgba(240,220,180,0.18)`,t.fillRect(0,0,n,n);let r=(e,t)=>[(e+700)/Jd*n,(t+700)/Jd*n],i=this.game.progress;t.font=`15px Rye, Georgia, serif`,t.textAlign=`center`;for(let[e,n]of Object.entries(Y)){let[a,o]=r(n.x,n.z),s=i.discovered.includes(e);t.fillStyle=s?`#3a2412`:`rgba(58,36,18,0.5)`,t.beginPath(),t.arc(a,o,4,0,7),t.fill(),t.fillStyle=s?`#2a1a0c`:`rgba(42,26,12,0.55)`,t.strokeStyle=`rgba(245,230,200,0.8)`,t.lineWidth=3;let c=s?n.name:`?`;t.strokeText(c,a,o-9),t.fillText(c,a,o-9)}let a=this.game.quests,o=a.tracked&&!a.done(a.tracked)?a.tracked:a.active()[0],s=o&&a.target(o);if(s){let[e,n]=r(s.x,s.z);t.fillStyle=`#e8a93a`,t.strokeStyle=`#3a2412`,t.lineWidth=2,t.beginPath(),t.moveTo(e,n-9),t.lineTo(e+7,n),t.lineTo(e,n+9),t.lineTo(e-7,n),t.closePath(),t.fill(),t.stroke()}let c=this.game.player.mode===`fly`?this.game.saucerCtl.pos:this.game.player.pos,[l,u]=r(c.x,c.z),d=this.game.player.mode===`fly`?this.game.saucerCtl.yaw:this.game.player.yaw;t.save(),t.translate(l,u),t.rotate(-d+Math.PI),t.fillStyle=`#7dffc8`,t.strokeStyle=`#123`,t.lineWidth=2,t.beginPath(),t.moveTo(0,-10),t.lineTo(7,8),t.lineTo(0,4),t.lineTo(-7,8),t.closePath(),t.fill(),t.stroke(),t.restore(),t.strokeStyle=`rgba(58,36,18,0.6)`,t.lineWidth=6,t.strokeRect(3,3,n-6,n-6)}rodeo(e){this.el.rodeo.classList.toggle(`hidden`,!e)}rodeoUpdate(e,t){this.el.needle.style.left=`${50+Math.max(-1,Math.min(1,e))*48}%`,this.el.needle.classList.toggle(`danger`,Math.abs(e)>.7),this.el.rprog.style.width=`${Math.min(1,t)*100}%`}update(e){let t=this.game,n=t.player;this.hintT>0&&(this.hintT-=e,this.hintT<=0&&this.el.hint.classList.remove(`show`));let r=n.stamina/100;this.el.stam.classList.toggle(`show`,r<.99&&!n.mount),this.el.stam.firstChild.style.width=`${r*100}%`;let i=this.game.progress.flags.jetpack,a=i?n.fuel/(n.fuelMax||8):n.hoverMax?n.hover/n.hoverMax:1;this.el.hov.classList.toggle(`show`,(i||n.hoverMax>0)&&a<.99),this.el.hov.firstChild.style.width=`${a*100}%`,this.el.cross.classList.toggle(`show`,n.aiming);let o=t.range;this.el.rangebox.classList.toggle(`hidden`,!o.active),o.active&&(this.el.rtime.textContent=o.time.toFixed(1),this.el.rhits.textContent=`${o.hits}/8 cans`);let s=t.sky.hours,c=Math.floor(s),l=Math.floor((s-c)*60/15)*15;if(this.el.clock.textContent=`${(c+11)%12+1}:${String(l).padStart(2,`0`)} ${c<12?`AM`:`PM`}`,this.game.camera.updateMatrixWorld(),this.updateCompass(),this.updateLabels(),this.tab===`map`&&this.journalOpen&&(this.mapT=(this.mapT||0)+e,this.mapT>.5)){this.mapT=0;let e=$(`#mapc`);e&&this.drawMap(e)}}updateCompass(){let e=this.game,t=e.camera,n=new V;t.getWorldDirection(n);let r=Math.atan2(n.x,-n.z),i=this.el.strip.clientWidth||560,a=Math.PI*.75,o=[],s=[[`N`,0],[`NE`,Math.PI/4],[`E`,Math.PI/2],[`SE`,3*Math.PI/4],[`S`,Math.PI],[`SW`,-3*Math.PI/4],[`W`,-Math.PI/2],[`NW`,-Math.PI/4]];for(let[e,t]of s)o.push({a:t,html:`<span class="cd ${e.length===1?`major`:``}">${e}</span>`});let c=e.player.mode===`fly`?e.saucerCtl.pos:e.player.pos,l=(e,t,n=``)=>{let r=Math.atan2(e.x-c.x,-(e.z-c.z)),i=Math.hypot(e.x-c.x,e.z-c.z);o.push({a:r,html:`<span class="cm ${t}"><i></i>${n?`<em>${n}</em>`:``}${t.includes(`quest`)?`<em>${Math.round(i)}m</em>`:``}</span>`})},u=e.quests,d=u.tracked&&!u.done(u.tracked)?u.tracked:u.active()[0],f=d&&u.target(d);f&&l(f,`quest`);let p=e.progress;for(let[e,t]of Object.entries(Y))if(p.discovered.includes(e)){let e=Math.hypot(t.x-c.x,t.z-c.z);e>60&&e<500&&l(t,`poi`,t.name)}let m=p.skills.xenosight;if(m){let t=m===1?90:180;for(let n of e.collectibles.items)n.taken||n.pos.distanceTo(c)<t&&l(n.pos,n.type===`part`?`part`:`nugget`)}this.compassPool=this.compassPool||[];let h=0;for(let e of o){let t=e.a-r;for(;t>Math.PI;)t-=Math.PI*2;for(;t<-Math.PI;)t+=Math.PI*2;if(Math.abs(t)>a/2)continue;let n=i/2+t/(a/2)*(i/2),o=this.compassPool[h];o||(o=Zg(`div`,`ci`),this.el.strip.appendChild(o),this.compassPool.push(o)),o._html!==e.html&&(o.innerHTML=e.html,o._html=e.html),o.style.display=``,o.style.transform=`translate3d(${n}px,0,0) translateX(-50%)`,o.style.opacity=String(1-(Math.abs(t)/(a/2))**3),h++}for(let e=h;e<this.compassPool.length;e++)this.compassPool[e].style.display=`none`}updateLabels(){let e=this.game,t=new Set,n=new V;for(let r of Object.values(e.npcs)){let i=r.pos.distanceTo(e.player.pos);if(i>14||this.inDialog||(n.copy(r.headPos()).project(e.camera),n.z>1))continue;let a=this.labelEls.get(r.id);a||(a=Zg(`div`,`nlabel`),this.el.labels.appendChild(a),this.labelEls.set(r.id,a));let o=e.quests.state&&(r.id!==`clementine`||!0),s=`${r.name}${o&&r.def.title?`<small>${r.def.title}</small>`:``}`;a._html!==s&&(a.innerHTML=s,a._html=s),a.style.transform=`translate3d(${(n.x*.5+.5)*innerWidth}px, ${(-n.y*.5+.5)*innerHeight}px, 0) translate(-50%,-100%)`,a.style.opacity=String(Math.min(1,(14-i)/4)),t.add(r.id)}for(let[e,n]of this.labelEls)t.has(e)||(n.style.opacity=`0`)}showPause(e){this.el.pause.classList.toggle(`hidden`,!e),e||$(`#settings`).classList.add(`hidden`),this.confirmNew=!1,$(`#newgame`).textContent=`Start Over`}},$g=`alien-frontier-settings-v1`,e_={master:.8,music:.7,sfx:.9,sensitivity:1,invertY:!1,quality:`auto`,showFps:!1,v:2};function t_(){try{let e=JSON.parse(localStorage.getItem($g)||`{}`);return(e.v||1)<2&&(e.quality=`auto`,e.v=2),{...e_,...e}}catch{return{...e_}}}function n_(e){try{localStorage.setItem($g,JSON.stringify(e))}catch{}}var r_=[{name:`Ultra`,pixelRatio:1.5,grass:1,farGrass:!0,clothRange:45,shadowSize:2048,bloom:!0},{name:`High`,pixelRatio:1.25,grass:1,farGrass:!0,clothRange:45,shadowSize:2048,bloom:!0},{name:`High-`,pixelRatio:1.25,grass:.7,farGrass:!0,clothRange:30,shadowSize:2048,bloom:!0},{name:`Medium`,pixelRatio:1,grass:.7,farGrass:!0,clothRange:25,shadowSize:1024,bloom:!0},{name:`Medium-`,pixelRatio:1,grass:.45,farGrass:!0,clothRange:15,shadowSize:1024,bloom:!1},{name:`Low`,pixelRatio:.85,grass:.3,farGrass:!1,clothRange:8,shadowSize:1024,bloom:!1},{name:`Lowest`,pixelRatio:.7,grass:.15,farGrass:!1,clothRange:0,shadowSize:512,bloom:!1}],i_={high:0,medium:3,low:5};function a_(){let e={renderer:`unknown`,tier:1,reason:`default`};try{let t=document.createElement(`canvas`).getContext(`webgl2`);if(!t)return{...e,tier:6,reason:`no WebGL 2`};let n=t.getExtension(`WEBGL_debug_renderer_info`),r=String(n?t.getParameter(n.UNMASKED_RENDERER_WEBGL):t.getParameter(t.RENDERER));e.renderer=r;let i=r.toLowerCase(),a=navigator.hardwareConcurrency||4,o=/android|iphone|ipad|mobile/i.test(navigator.userAgent)||navigator.maxTouchPoints>1&&!matchMedia(`(pointer: fine)`).matches;return/swiftshader|llvmpipe|software|basic render|microsoft basic/.test(i)?{...e,tier:6,reason:`software rendering`}:o?{...e,tier:5,reason:`mobile device`}:/nvidia|geforce|rtx|gtx|radeon rx|radeon pro|amd radeon(?!.*graphics)|arc a/.test(i)?{...e,tier:0,reason:`dedicated GPU`}:/apple m\d (pro|max|ultra)|apple m[3-9]/.test(i)?{...e,tier:0,reason:`fast Apple GPU`}:/apple/.test(i)?{...e,tier:1,reason:`Apple GPU`}:/intel|uhd|iris|hd graphics|radeon.*graphics|vega/.test(i)?{...e,tier:a<=4?4:3,reason:`integrated GPU`}:a<=4?{...e,tier:3,reason:`few CPU cores`}:e}catch{return e}}var o_=class{constructor(e){this.tier=e,this.window=[],this.warmup=3,this.goodTime=0,this.failedUp=new Map,this.cooldown=0,this.strikes=0}settle(e=4){this.warmup=Math.max(this.warmup,e),this.window.length=0,this.strikes=0}sample(e){if(e>.25)return null;if(this.warmup>0)return this.warmup-=e,null;if(this.window.push(e),this.window.length<90)return null;let t=[...this.window].sort((e,t)=>e-t),n=this.window.reduce((e,t)=>e+t,0)/this.window.length,r=t[Math.floor(t.length*.9)];if(this.window.length=0,(n>1/45||r>1/30)&&this.tier<r_.length-1)return this.strikes++,this.strikes<2&&n<1/25?null:(this.lastUp===this.tier&&this.failedUp.set(this.tier,(this.failedUp.get(this.tier)??0)+1),this.change(this.tier+(n>1/25?2:1)));this.strikes=0,n<1/58&&r<1/50?this.goodTime+=n*90:this.goodTime=0;let i=this.failedUp.get(this.tier-1)??0,a=i?60*2**(i-1):12;return this.goodTime>a&&this.tier>0?(this.lastUp=this.tier-1,this.change(this.tier-1)):null}change(e){return this.tier=Math.max(0,Math.min(r_.length-1,e)),this.warmup=3,this.goodTime=0,this.strikes=0,this.window.length=0,this.tier}},s_=`alien-frontier-save-v1`,c_={uniforms:{tDiffuse:{value:null},uTime:{value:0},uNight:{value:0}},vertexShader:`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,fragmentShader:`
    uniform sampler2D tDiffuse; uniform float uTime; uniform float uNight; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + uTime*7.0)*43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec3 col = c.rgb;
      float l = dot(col, vec3(0.2126,0.7152,0.0722));
      // saturation + warm highlights / cool shadows
      col = mix(vec3(l), col, 1.12);
      vec3 warm = vec3(1.06, 1.0, 0.9), cool = mix(vec3(0.92, 0.98, 1.08), vec3(0.85,0.92,1.15), uNight);
      col *= mix(cool, warm, smoothstep(0.0, 0.6, l));
      // vignette
      vec2 d = vUv - 0.5;
      float v = smoothstep(0.85, 0.25, length(d * vec2(1.1, 1.0)));
      col *= mix(0.62, 1.0, v);
      col += (hash(vUv*1000.0) - 0.5) * 0.015;
      gl_FragColor = vec4(col, c.a);
    }`},l_=new class{constructor(){this.canvas=document.getElementById(`game`);let e=new pd({canvas:this.canvas,antialias:!1,powerPreference:`high-performance`});e.setPixelRatio(Math.min(window.devicePixelRatio,1.5)),e.setSize(innerWidth,innerHeight),e.shadowMap.enabled=!0,e.shadowMap.type=1,e.toneMapping=4,e.toneMappingExposure=1,this.renderer=e,this.scene=new Jt,this.camera=new us(60,innerWidth/innerHeight,.1,5e3),this.lastT=performance.now(),this.time=0,this.started=!1,this.paused=!1;let t=new lt(innerWidth,innerHeight,{type:p,samples:4});this.composer=new Sd(e,t),this.composer.setPixelRatio(Math.min(window.devicePixelRatio,1.5)),this.composer.addPass(new Cd(this.scene,this.camera)),this.bloom=new Td(new z(innerWidth,innerHeight),.4,.55,.92),this.composer.addPass(this.bloom),this.grade=new yd(c_),this.composer.addPass(this.grade),this.composer.addPass(new Dd),window.addEventListener(`resize`,()=>this.resize()),this.input=new Yg(this.canvas),this.audio=new Jg,this.progress=new Sg(this),this.quests=new Tg(this),this.story=new Og(this),this.ui=new Qg(this),this.settings=t_(),[`auto`,`low`,`medium`,`high`].includes(this.settings.quality)||(this.settings.quality=`auto`),this.gpu=a_(),this.auto=new o_(this.gpu.tier),console.info(`[quality] ${this.gpu.renderer} -> ${r_[this.gpu.tier].name} (${this.gpu.reason})`)}resize(){this.camera.aspect=innerWidth/innerHeight,this.camera.updateProjectionMatrix(),this.renderer.setSize(innerWidth,innerHeight),this.composer.setSize(innerWidth,innerHeight)}async build(){let e=async(e,t)=>{window.__bootProgress?.(e,t),await new Promise(e=>setTimeout(e,0))};await e(.2,`Painting the sky…`),await document.fonts.load(`40px Rye`).catch(()=>{}),await document.fonts.ready;let t=this.scene;this.collision=new Sm,this.sky=new Of(t);let{mesh:n,heightTex:r,colorTex:i}=Sf();this.terrainMesh=n,t.add(n),this.water=wf(sp),t.add(this.water),await e(.3,`Growing the prairie grass…`),this.grass=gp(r,i),t.add(this.grass),await e(.4,`Planting the corn…`),this.crops=Cp(t),await e(.55,`Raising cottonwoods and pines…`),kp(t,this.collision,pp),Ap(t),await e(.68,`Building Dusty Gulch…`),this.world=ym(t,this.collision),await e(.8,`Rounding up the cattle…`),this.pmrem=new bc(this.renderer),this.envScene=new Jt,this.envSky=new G(this.sky.mesh.geometry,this.sky.mesh.material),this.envScene.add(this.envSky),this.updateEnv(),this.fx=new Hg(t),this.saucer=Cm(null),t.add(this.saucer.group),this.saucerCtl=new Bg(this,this.saucer),this.collision.addCircle(Y.crash.x,Y.crash.z,4.2),await jh(),this.player=new og(this);let a=this.world.anchors;this.dog=new vg(this,a.crashCamp.x+1.3,a.crashCamp.z-1.6),this.horse=new _g(this,a.corral.x,a.corral.z),this.cows=[];let o=a.pen;for(let e=0;e<3;e++){let t=new gg(this,o.x0+4+e*4,(o.z0+o.z1)/2+(e-1)*2);t.penned=!0,this.cows.push(t)}for(let[e,t,n]of[[`Daisy`,128,-12],[`Buttercup`,296,-104],[`Moonpie`,96,-112]])this.cows.push(new gg(this,t,n,{stray:!0,name:e}));for(let[e,t]of[[-60,60],[-110,150],[260,120],[-200,60]])this.cows.push(new gg(this,e,t));this.tumbleweeds=new yg(this),this.npcs={};for(let e of Eg(a))this.npcs[e.id]=new sg(this,e);this.collectibles=new Mg(this),this.lasso=new Ig(this),this.beam=new Lg(this),this.range=new Rg(this),this.rodeo=new zg(this),this.groundHat=Qh(`drifter`,1.12),this.groundHat.position.copy(a.hatSpot).add(new V(0,.05,0)),this.groundHat.rotation.set(.25,.6,.1),t.add(this.groundHat),this.newGameState(),await e(.9,`Polishing the saucer…`),this.setupTitleScene(),this.applySettings(),this.renderer.compile(t,this.camera),await e(1,`Ready.`)}applySettings(){let e=this.settings;this.applyTier(e.quality===`auto`?this.auto.tier:i_[e.quality]),this.audio.setVolumes({master:e.master,music:e.music,sfx:e.sfx}),this.ui.fps(e.showFps?0:null),n_(e)}get tierName(){return r_[this.tierIndex??0].name}applyTier(e){let t=r_[e];this.tierIndex=e;let n=Math.min(window.devicePixelRatio,t.pixelRatio);Math.abs(this.renderer.getPixelRatio()-n)>.001&&(this.renderer.setPixelRatio(n),this.composer.setPixelRatio(n),this.resize());let r=this.sky.sun.shadow;r.mapSize.x!==t.shadowSize&&(r.mapSize.set(t.shadowSize,t.shadowSize),r.map?.dispose(),r.map=null),this.bloom.enabled=t.bloom,this.grass.children.forEach((e,n)=>{e.userData.full??=e.geometry.instanceCount,e.geometry.instanceCount=Math.floor(e.userData.full*t.grass),n>0&&(e.visible=t.farGrass)}),ig.clothRange=t.clothRange}setupTitleScene(){let e=Y.crash;this.titleSpot=new V(e.x+9,0,e.z+4),this.titleSpot.y=X(this.titleSpot.x,this.titleSpot.z),this.sky.t=.742;let t=this.player;t.pos.copy(this.titleSpot),t.object.position.copy(this.titleSpot),t.rig.setHat(`drifter`),t.rig.showHat(!0),t.rig.setJetpack(!0),this.dog.pos.set(this.titleSpot.x+.9,0,this.titleSpot.z+1.1),this.dog.pos.y=X(this.dog.pos.x,this.dog.pos.z),this.updateEnv()}updateTitle(e){let t=this.titleSpot;this.sky.update(e*.15,t);let n=this.time,r=this.player,i=new V(t.x+4.4+Math.sin(n*.06)*.4,t.y+1.3+Math.sin(n*.09)*.12,t.z-1.2+Math.sin(n*.045)*.5),a=Math.atan2(i.x-t.x,i.z-t.z);r.yaw=a-.75,r.object.rotation.y=r.yaw,r.rig.lookYaw=.45+Math.sin(n*.21)*.3,r.rig.update(e,{speed:0,grounded:!0,ground:X}),this.dog.yaw=a-1.4,this.dog.update(e);let o=t.clone().add(new V(0,1.55,0)),s=o.clone().sub(i).normalize(),c=new V().crossVectors(s,new V(0,1,0)).normalize();this.camera.position.copy(i),this.camera.lookAt(o.addScaledVector(c,-2.1).add(new V(0,.35,0))),this.camera.fov=48,this.camera.updateProjectionMatrix()}startCinematic(){let e=Y.crash,t=X(e.x,e.z);this.cine={t:0,skip:0,impacted:!1,p0:new V(e.x-330,t+150,e.z+170),p1:new V(e.x-70,t+34,e.z+38),p2:new V(e.x,t+.6,e.z),cam:new V(e.x+30,X(e.x+30,e.z-20)+10,e.z-20),look:new V(e.x-70,t+34,e.z+38),shake:0},this.sky.t=.245,this.updateEnv(),this.player.object.visible=!1,this.ui.cinematic(!0),this.ui.cineCaption(`Somewhere in the Midwest<small>1887</small>`),this.audio.incoming(),this.audio.soundtrack?.setContext(`night`)}updateCinematic(e){let t=this.cine,n=this.input;t.t+=e,n.down(`Space`)||n.down(`Escape`)||n.down(`Enter`)?t.skip+=e:t.skip=Math.max(0,t.skip-e*2),this.ui.cineSkip(Math.min(1,t.skip/.7));let r=6.2,i=this.saucer.group;if(this.sky.update(0,t.cam),t.t<r){let n=t.t/r,a=n*n,o=t.p0.clone().lerp(t.p1,a),s=t.p1.clone().lerp(t.p2,a),c=o.lerp(s,a);i.position.copy(c),i.rotation.set(.35+Math.sin(t.t*9)*.2,t.t*5,.25+Math.sin(t.t*7)*.25),this.saucer.update(e,{crashed:!0});for(let e=0;e<4;e++)this.fx.glow.emit({x:c.x+(Math.random()-.5),y:c.y+(Math.random()-.5),z:c.z+(Math.random()-.5),vx:0,vy:0,vz:0,life:.7+Math.random()*.5,size:4.5,size1:.6,r:1,g:.5+Math.random()*.35,b:.18,a:1,drag:1});for(let e=0;e<2;e++)this.fx.soft.emit({x:c.x+(Math.random()-.5)*2,y:c.y,z:c.z+(Math.random()-.5)*2,vx:0,vy:.5,vz:0,life:5,size:5,size1:14,r:.22,g:.2,b:.22,a:.55,drag:.3,fadeIn:.05});t.look.lerp(c,1-Math.exp(-e*4))}else if(t.impacted)this.saucerCtl.update(e,n),t.look.lerp(t.p2.clone().add(new V(0,1,0)),1-Math.exp(-e*2)),t.cam.lerp(new V(t.p2.x+17,X(t.p2.x+17,t.p2.z-11)+5.5,t.p2.z-11),1-Math.exp(-e*.35));else{t.impacted=!0,this.saucerCtl.setCrashed(),t.shake=1,this.audio.boom(),this.fx.flash(t.p2.clone().add(new V(0,3,0))),this.fx.flashLight.intensity=400,this.fx.flashT=.35;for(let e=0;e<90;e++){let e=Math.random()*Math.PI*2,n=6+Math.random()*14;this.fx.soft.emit({x:t.p2.x,y:t.p2.y+.5,z:t.p2.z,vx:Math.cos(e)*n,vy:1+Math.random()*4,vz:Math.sin(e)*n,life:2.5+Math.random()*2,size:2.5,size1:9,r:.36,g:.29,b:.22,a:.28,drag:1.4,fadeIn:.02})}this.fx.burst(t.p2.clone().add(new V(0,1,0)),`#ffb060`,80),this.fx.sparks(t.p2.clone().add(new V(0,1,0))),this.ui.cineCaption(``)}t.shake=Math.max(0,t.shake-e*.8);let a=t.shake*t.shake*.8;this.camera.position.copy(t.cam).add(new V((Math.random()-.5)*a,(Math.random()-.5)*a,(Math.random()-.5)*a)),this.camera.lookAt(t.look),this.camera.fov=50,this.camera.updateProjectionMatrix(),this.fx.update(e);for(let t of this.world.fires)t.update(e,this.fx.soft);t.t>9.3&&!t.fading&&(t.fading=!0,this.ui.fade(!0)),(t.t>10.5||t.skip>.7)&&this.endCinematic()}endCinematic(){let e=this.cine;e&&!e.done&&(e.done=!0,this.ui.fade(!0),setTimeout(()=>{this.cine=null,this.saucerCtl.setCrashed(),this.ui.cinematic(!1),this.ui.cineCaption(``),this.player.object.visible=!0,this.sky.t=.27,this.updateEnv(),this.player.teleport(Y.crash.x+5,Y.crash.z-8,-2.4),this.player.startAction(`pickup`,1.6),this.beginPlay(!1)},e.fading?200:900))}beginPlay(e){this.auto.settle(3),this.started=!0,this.ui.fade(!1),this.player.snapCamera=!0,this.input.lock(),this.ui.refresh(),e||(this.quests.start(`crash`,!0),this.ui.questBanner(`Chapter One`,`Crash Landing`),setTimeout(()=>this.ui.hint(`Ow. Your ship is wrecked. Move with WASD and look around with the mouse.`,7),1500))}quitToTitle(){this.save(),this.ui.fade(!0),setTimeout(()=>location.reload(),700)}showEnding(){let e=this.progress,t=Math.round((e.stats.time||0)/60);this.paused=!0,document.exitPointerLock(),this.ui.showEnding([[`Level`,e.level],[`Dollars`,`$${e.money}`],[`Places found`,`${e.discovered.length}/${Object.keys(Y).length}`],[`Cows abducted`,e.stats.abducted],[`Cans shot`,e.stats.cans],[`Time on the frontier`,`${t} min`]]),this.audio.levelUp()}updateEnv(){this.envRT&&this.envRT.dispose(),this.envRT=this.pmrem.fromScene(this.envScene,.02,1,5e3),this.scene.environment=this.envRT.texture,this.scene.environmentIntensity=.55,this.envTimer=0}newGameState(){let e=this.world.anchors;this.progress.reset(),this.quests.state={},this.quests.tracked=null,this.sky.t=.29;let t=Y.crash;this.player.teleport(t.x+5,t.z-8,-2.4),this.player.mode=`walk`,this.player.object.visible=!0,this.player.rig.showHat(!1),this.player.rig.setOutfit(`duster`),this.player.rig.setJetpack(!1),this.groundHat.visible=!0,this.dog.joined=!1,this.dog.pos.set(e.crashCamp.x+1.3,e.crashCamp.y,e.crashCamp.z-1.6),this.horse.setTamed(!1),this.saucerCtl.setCrashed(),this.progress.discovered=[`crash`]}applySave(e){this.progress.load(e.progress),this.quests.load(e.quests),this.sky.t=e.time??.3,this.player.teleport(e.player.x,e.player.z,e.player.yaw),this.player.rig.showHat(this.progress.hasHat),this.progress.hasHat&&this.player.rig.setHat(this.progress.hat),this.player.rig.setOutfit(this.progress.outfit||`duster`),this.player.rig.setJetpack(!!this.progress.flags.jetpack),this.groundHat.visible=!this.progress.hasHat,this.dog.joined=!!e.dog,this.dog.joined&&this.dog.pos.set(e.player.x+2,X(e.player.x+2,e.player.z),e.player.z),e.horse&&(this.horse.setTamed(!!e.horse.tamed),this.horse.pos.set(e.horse.x,X(e.horse.x,e.horse.z),e.horse.z)),(e.cows||[]).forEach((e,t)=>{let n=this.cows[t];if(n&&(n.penned=e.penned,n.countedPen=!!e.counted||n.stray&&e.penned,n.pos.set(e.x,X(e.x,e.z),e.z),n.penned)){let e=this.world.anchors.pen;n.home.set((e.x0+e.x1)/2,0,(e.z0+e.z1)/2)}}),this.collectibles.restore(this.progress.collected),e.saucer&&e.saucer.state!==`crashed`&&(this.saucerCtl.yaw=e.saucer.yaw||0,this.saucerCtl.park(e.saucer.x,e.saucer.z))}save(){if(!this.started)return;let e=this.player,t=e.mode===`fly`?this.saucerCtl.lastPark:e.pos,n={progress:this.progress.toJSON(),quests:this.quests.toJSON(),time:this.sky.t,player:{x:t.x,z:t.z,yaw:e.yaw},dog:this.dog.joined,horse:{tamed:this.horse.tamed,x:this.horse.pos.x,z:this.horse.pos.z},cows:this.cows.map(e=>({penned:e.penned,counted:!!e.countedPen,x:e.pos.x,z:e.pos.z})),saucer:{state:{flying:`parked`,repairing:`crashed`}[this.saucerCtl.state]||this.saucerCtl.state,x:this.saucerCtl.lastPark.x,z:this.saucerCtl.lastPark.z,yaw:this.saucerCtl.yaw}};try{localStorage.setItem(s_,JSON.stringify(n))}catch{}}loadSave(){try{return JSON.parse(localStorage.getItem(s_))}catch{return null}}start(e){this.auto.settle(),this.audio.init(),this.applySettings();let t=e?this.loadSave():null;if(this.ui.hideTitle(),this.camera.fov=60,t)this.applySave(t),this.ui.fade(!0),setTimeout(()=>this.beginPlay(!0),900);else{try{localStorage.removeItem(s_)}catch{}this.newGameState(),this.startCinematic()}}newGame(){try{localStorage.removeItem(s_)}catch{}location.reload()}resume(){this.paused=!1,this.ui.showPause(!1),this.input.lock()}toggleMusic(){this.audio.setMusic(!this.audio.musicOn),this.ui.showPause(this.paused),this.ui.hint(`Music ${this.audio.musicOn?`on`:`off`}`,1.5)}sleep(){this.ui.fade(!0),setTimeout(()=>{this.sky.t=.27,this.updateEnv(),this.ui.fade(!1),this.ui.hint(`You wake up rested. A new day on the frontier.`),this.save()},1300)}wearHat(e){this.progress.hat=e,this.progress.hasHat=!0,this.player.rig.showHat(!0),this.player.rig.setHat(e),this.save()}wearOutfit(e){this.progress.outfit=e,this.player.rig.setOutfit(e),this.save()}setTalking(e,t){e.talking=t,this.player.frozen=t;let n=this.player;if(t){let t=Math.atan2(e.pos.x-n.pos.x,e.pos.z-n.pos.z);n.yaw=t,n.object.rotation.y=t,this.savedCam={yaw:n.cam.yaw,pitch:n.cam.pitch,dist:n.cam.targetDist},n.cam.yaw=t+Math.PI-.45,n.cam.pitch=.08,n.cam.targetDist=3.6}else this.savedCam&&=(n.cam.targetDist=this.savedCam.dist,null)}penCow(e){let t=this.world.anchors.pen;e.penned=!0,e.home.set((t.x0+t.x1)/2,0,(t.z0+t.z1)/2),e.state=`graze`,this.audio.moo(e.pos,1),e.stray&&!e.countedPen&&(e.countedPen=!0,this.progress.stats.cowsPenned+=1,this.ui.toast(`${e.name} is home`,`Safe in the pen`,`quest`),this.progress.addXP(25,`Cow wrangled`),this.quests.emit(`penned`,e.name)),this.save()}findInteraction(){let e=this.player,t=this.world.anchors,n=this.quests;if(e.mode===`fly`||this.rodeo.active)return null;let r=e.pos,i=[],a=(e,t)=>e.distanceTo(r)<t;e.mount&&i.push({label:`[E] Dismount ${e.mount.name}`,d:99,fn:()=>this.dismount()});for(let e of Object.values(this.npcs))a(e.pos,3.2)&&i.push({label:`[E] Talk to ${e.name}`,d:e.pos.distanceTo(r),fn:()=>this.talkTo(e)});!this.progress.hasHat&&a(this.groundHat.position,2.6)&&i.push({label:`[E] Take the scarecrow's hat`,d:0,fn:()=>this.takeHat()}),!this.dog.joined&&a(this.dog.pos,2.6)?i.push({label:`[E] Pet the sleepy dog`,d:.5,fn:()=>this.adoptDog()}):this.dog.joined&&a(this.dog.pos,1.8)&&!e.mount&&i.push({label:`[E] Pet Biscuit`,fn:()=>{this.audio.bark(this.dog.pos),this.ui.hint(`Biscuit's tail goes a mile a minute.`,2)},d:50}),!e.mount&&a(this.horse.pos,3.2)&&(this.horse.tamed?i.push({label:`[E] Ride Stardust`,d:1,fn:()=>this.mount()}):(this.progress.skills.lasso>0||n.started(`mustang`))&&i.push({label:`[E] Try to tame the mustang`,d:1,fn:()=>this.rodeo.start()})),!e.mount&&a(t.range.shooter,3)&&!this.range.active&&i.push({label:`[E] Start target practice`,d:1,fn:()=>this.range.start()});let o=this.saucerCtl,s=Math.hypot(o.pos.x-r.x,o.pos.z-r.z);!e.mount&&s<7.5&&(o.state===`crashed`?this.progress.parts.length>=6?i.push({label:`[E] Repair your saucer`,d:1,fn:()=>o.repair()}):i.push({label:`[E] Inspect the wreck`,d:3,fn:()=>this.ui.hint(`Your saucer is busted. ${6-this.progress.parts.length} missing part${6-this.progress.parts.length==1?``:`s`}. ${this.progress.parts.length?``:`Pieces must have scattered for miles.`}`)}):o.state===`parked`&&i.push({label:`[E] Board your saucer`,d:1,fn:()=>o.board()})),!e.mount&&s<7.5&&!this.progress.flags.jetpack&&i.push({label:`[E] Salvage the emergency jetpack`,d:.2,fn:()=>this.salvageJetpack()});let c=t.crashCamp;return!e.mount&&a(c,2.8)&&this.sky.night>.4&&i.push({label:`[E] Rest by the fire till morning`,d:2,fn:()=>this.sleep()}),i.length?(i.sort((e,t)=>e.d-t.d),i[0]):null}talkTo(e){let t=this.story.talk(e.id);this.ui.openDialog(e,t)}takeHat(){this.progress.hasHat=!0,this.progress.hats.includes(`drifter`)||this.progress.hats.push(`drifter`),this.player.rig.setHat(this.progress.hat||`drifter`),this.groundHat.visible=!1,this.player.rig.showHat(!0),this.player.startAction(`tip`,1.2),this.fx.burst(this.player.pos.clone().add(new V(0,2.2,0)),`#ffd66a`,20),this.audio.chime(),this.ui.toast(`Now you look the part`,`A fine drifter hat. Slightly scarecrow-scented.`,`quest`),this.quests.emit(`hat`),this.save()}salvageJetpack(){this.progress.flags.jetpack=!0,this.player.rig.setJetpack(!0),this.player.startAction(`pickup`,.8),this.fx.burst(this.player.pos.clone().add(new V(0,1.4,0)),`#6affd6`,30),this.audio.pickupPart(),this.ui.toast(`Jetpack salvaged!`,`Jump, then HOLD Space to fly. WASD steer · Shift boost · C descend`,`part`),this.ui.hint(`Jump, then hold SPACE to fly. Fuel refills on the ground.`,8),this.progress.addXP(30,`Emergency jetpack`),this.quests.emit(`jetpack`),this.save()}adoptDog(){this.dog.joined=!0,this.audio.bark(this.dog.pos),this.ui.toast(`Biscuit joined you!`,`The scruffy dog sniffs your three-fingered hand and decides you're family.`,`quest`),this.progress.addXP(25,`Made a friend`),this.quests.emit(`dog`),this.save()}mount(){let e=this.player;e.mount=this.horse,this.horse.rider=e,this.horse.called=!1,this.lasso.release(),this.audio.neigh()}dismount(){let e=this.player,t=this.horse;e.mount=null,t.rider=null,t.speed=0,t.state=`idle`,t.timer=5;let n=new V(Math.cos(t.yaw),0,-Math.sin(t.yaw)).multiplyScalar(-1.3);e.pos.copy(t.pos).add(n),e.pos.y=X(e.pos.x,e.pos.z),e.vel.set(0,0,0),e.grounded=!0,this.lasso.release()}discover(){let e=this.player.mode===`fly`?this.saucerCtl.pos:this.player.pos;for(let[t,n]of Object.entries(Y))this.progress.discovered.includes(t)||Math.hypot(e.x-n.x,e.z-n.z)<Math.max(n.r,35)&&(this.progress.discovered.push(t),this.ui.questBanner(`Discovered`,n.name),this.audio.chime(),this.progress.addXP(40,n.name),this.quests.emit(`discover`,t),t===`mine`&&!this.quests.started(`gold`)&&this.quests.start(`gold`),this.save())}handleKeys(){let e=this.input,t=this.ui;if(t.inDialog){(e.hit(`KeyE`)||e.hit(`Space`)||e.hit(`Enter`)||e.mouse.clicked)&&t.advanceDialog();for(let n=0;n<4;n++)e.hit(`Digit${n+1}`)&&t.choose(n);return}if(e.hit(`Escape`)&&t.journalOpen){t.closeJournal(),e.lock();return}if(e.hit(`Tab`)||e.hit(`KeyJ`)){t.journalOpen?(t.closeJournal(),e.lock()):(t.openJournal(),document.exitPointerLock());return}if(e.hit(`KeyM`)){t.journalOpen&&t.tab===`map`?(t.closeJournal(),e.lock()):(t.openJournal(`map`),document.exitPointerLock());return}if(!t.journalOpen&&(e.hit(`KeyN`)&&this.toggleMusic(),this.player.mode!==`fly`)){if(e.hit(`KeyE`)){let e=this.findInteraction();e&&e.fn()}if(e.hit(`KeyF`)&&this.lasso.trigger(),e.hit(`KeyH`)&&(this.audio.tone(`sine`,1800,2400,.25,.1),this.audio.tone(`sine`,1600,2600,.3,.1,{at:.3}),this.horse.tamed&&!this.player.mount&&(this.horse.called=!0,this.ui.hint(`*whistle* Stardust is on his way.`,2))),this.player.aiming&&e.mouse.clicked){let e=performance.now(),t=[450,380,300,220][this.progress.skills.quickdraw];(!this.lastShot||e-this.lastShot>t)&&(this.lastShot=e,this.range.shoot())}}}update(e){let t=this.input;if(this.time+=e,sp.uTime.value=this.time,this.cine){this.updateCinematic(e),this.commonVisuals(e),this.audio.update(e,{listener:this.camera.position,night:.6,theme:`night`});return}if(!this.started){this.updateTitle(e),this.saucerCtl.update(e,t),this.fx.update(e);for(let t of this.world.fires)t.update(e,this.fx.soft);this.commonVisuals(e),this.audio.update(e,{listener:this.camera.position,night:this.sky.night,theme:`prairie`});return}if(this.paused)return;this.handleKeys();let n=this.player;if(this.ui.journalOpen||this.ui.overlayOpen){this.commonVisuals(e),this.ui.prompt(``),this.ui.update(e);return}let r=e*(n.aiming?[1,.8,.6,.35][this.progress.skills.quickdraw]:1);n.frozen=this.ui.inDialog||this.ui.journalOpen||this.rodeo.active,this.rodeo.active?(this.rodeo.update(e,t),n.pos.copy(this.horse.seatPosition()),n.object.position.copy(n.pos),n.object.position.y-=n.rig.legLen-.05,n.object.rotation.y=this.horse.yaw,n.rig.update(e,{speed:0,grounded:!0,mode:`ride`,action:`lasso`}),n.updateCamera(e)):n.update(e,t),this.saucerCtl.update(r,t),this.sky.update(r,n.mode===`fly`?this.saucerCtl.pos:n.pos),sp.uPlayer.value.copy(n.pos),this.dog.update(r),this.horse.update(r);for(let e of this.cows)e.update(r);for(let e of Object.values(this.npcs))e.update(r);this.tumbleweeds.update(r),this.lasso.update(r),this.beam.update(r,t),this.range.update(r),this.collectibles.update(r,this.time),this.fx.update(r);for(let e of this.world.fires)e.update(r,this.fx.soft);for(let e of this.world.updaters)e(r,{player:n});this.quests.update(),this.discover(),this.commonVisuals(e);let i=this.ui.inDialog||this.ui.journalOpen?null:this.findInteraction(),a=!t.locked&&!this.ui.journalOpen&&!this.ui.inDialog;this.ui.prompt(i?i.label:n.mode===`fly`?`[E] Land`:a?`Click to look around`:``),this.ui.update(e);let o=n.mode===`fly`?this.saucerCtl.pos:n.pos,s=n.mode===`fly`||n.jetting||n.jetK>.1||o.y-X(o.x,o.z)>6;this.flightHold=s?7:Math.max(0,(this.flightHold||0)-e);let c=Math.hypot(o.x-Y.town.x,o.z-Y.town.z)<95,l=this.flightHold>0?`flight`:c?`town`:this.sky.night>.55?`night`:`prairie`;this.audio.update(e,{theme:l,listener:n.mode===`fly`?this.saucerCtl.pos:n.pos,night:this.sky.night,windiness:n.mode===`fly`?1.8:1,riverDist:Math.min(rf.dist(n.pos.x,n.pos.z),Math.hypot(n.pos.x-Y.lake.x,n.pos.z-Y.lake.z)-Y.lake.r)}),this.progress.stats.time=(this.progress.stats.time||0)+e,this.saveT=(this.saveT||0)+e,this.saveT>20&&(this.saveT=0,this.save())}commonVisuals(e){let t=this.sky,n=this.started;if(this.beamsShown!==n){this.beamsShown=n;for(let e of this.collectibles.items)e.beam&&!e.taken&&(e.beam.visible=n)}let r=t.night;ig.cameraPos=this.camera.position,this.crops?.update(this.camera.position),Fh.uRim.value=.4*(1-r*.75),Rp(r);for(let e of this.world.lights)e.intensity=r*14;for(let e of this.world.fires)if(e.nightOnly){let t=r>.25;for(let n of e.group.children)n!==e.light&&(n.visible=t);e.off=!t}let i=this.water.material.uniforms;i.uSky.value.copy(t.state.hor).lerp(t.state.top,.3),i.uSunDir.value.copy(t.lightDir),i.uSunColor.value.copy(t.state.sun).multiplyScalar(t.sun.intensity*.35),i.uLight.value=.25+(1-r)*.75;let a=pp;a.uSunDir.value.copy(t.lightDir),a.uSunCol.value.copy(t.state.sun).multiplyScalar(t.sun.intensity*.36),a.uAmb.value.copy(t.state.hemiS).multiplyScalar(t.hemi.intensity*.42).add(t.state.top.clone().lerp(t.state.hor,.5).multiplyScalar(.12+.25*r));let o=this.player.mode===`fly`?this.saucerCtl.pos:this.player.pos;a.uCenter.value.set(o.x,0,o.z),this.scene.fog.density=.00105+r*9e-4,this.grade.uniforms.uTime.value=this.time,this.grade.uniforms.uNight.value=r,this.bloom.strength=.35+r*.35,this.envTimer=(this.envTimer||0)+e,this.envTimer>4&&this.updateEnv()}setAttended(e){this.suspended=!e,this.audio.ctx&&(e?this.audio.ctx.resume():this.audio.ctx.suspend(),!e&&document.pointerLockElement&&document.exitPointerLock())}loop=()=>{if(requestAnimationFrame(this.loop),this.suspended){this.lastT=performance.now();return}let e=performance.now();if(this.settings.quality===`auto`&&!this.paused&&!document.hidden&&this.lastT){let t=this.auto.sample((e-this.lastT)/1e3);t!==null&&(this.applyTier(t),console.info(`[quality] auto -> ${r_[t].name}`),document.getElementById(`settings`).classList.contains(`hidden`)||this.ui.renderSettings())}this.settings.showFps&&(this.fpsN=(this.fpsN||0)+1,e-(this.fpsT||0)>1e3&&(this.ui.fps(`${Math.round(this.fpsN*1e3/(e-(this.fpsT||e-1e3)))} fps · ${r_[this.tierIndex].name}`),this.fpsN=0,this.fpsT=e));let t=Math.min((e-this.lastT)/1e3,.05);this.lastT=e,this.update(t),this.composer.render(),this.input.endFrame()}};window.game=l_,(async()=>{await l_.build();let e=l_.loadSave();l_.ui.showTitle(e),window.__bootDone?.();let t=()=>{l_.audio.init(),l_.applySettings(),l_.ui.soundReady(),window.removeEventListener(`pointerdown`,t),window.removeEventListener(`keydown`,t)};window.addEventListener(`pointerdown`,t),window.addEventListener(`keydown`,t),document.getElementById(`play`).addEventListener(`click`,()=>l_.start(!1)),document.getElementById(`continue`).addEventListener(`click`,()=>l_.start(!0)),l_.canvas.addEventListener(`click`,()=>{l_.started&&!l_.paused&&!l_.ui.journalOpen&&l_.input.lock()}),document.addEventListener(`pointerlockchange`,()=>{!document.pointerLockElement&&l_.started&&!l_.cine&&!l_.ui.journalOpen&&!l_.ui.inDialog&&!l_.ui.overlayOpen&&(l_.paused=!0,l_.ui.showPause(!0))}),l_.loop()})();