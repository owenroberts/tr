var blocker = document.getElementById( 'blocker' );
var startButton = document.getElementById( 'start-button' );
var instructions = document.getElementById( 'instructions' );
var bkgMusic, bkgLoader;

let restart = false;

const idles = [2, 3, 5, 6, 7];
const walks = [20, 21, 22, 23];
const talks = [12, 13, 14, 16, 17];

/* sides  0 front  1 back  2 top  3 bottom  4 right  5 left*/
const dialogs = [
	{ track: "clips/1.mp3",	 anim: "drawings/city.json", 
		sides: [0, 1, 4, 5], 
		delay: 4000, end: 4000 },
	{ track: "clips/2.mp3",	 anim: "drawings/drive.json", 
		sides: [0,1, 4, 5], 
		delay: 4000, end: 3000 },
	{ track: "clips/3.mp3",	 anim: "drawings/woods.json", 
		sides: [0, 1, 4, 5], 
		delay: 3000, end: 3000},
	{ track: "clips/4.mp3",	 anim: "drawings/tramp.json", 
		sides: [0, 1, 3, 4, 5], 
		delay: 3000, end: 4000 },
	{ track: "clips/5.mp3",  anim: "drawings/hiding.json", 
		sides: [0, 1, 4, 5], 
		delay: 3000, end: 5000 },
	{ track: "clips/6.mp3",	 anim: "drawings/bounce_w_action_lines.json", 
		sides: [0, 1, 4, 5], 
		delay: 3000, end: 3000 },
	{ track: "clips/7.mp3",	 anim: "drawings/weight.json", 
		sides: [3], 
		delay: 7000, end: 3000 },
	{ track: "clips/8.mp3",	 anim: "drawings/shadow.json", 
		sides: [3], 
		delay: 3000, end: 4000 },
	{ track: "clips/9.mp3",	 anim: "drawings/woman_w_eyes.json", 
		sides: [0, 1, 4, 5], 
		delay: 3000, end: 3000 },
	{ track: "clips/10.mp3", anim: "drawings/house.json", 
		sides: [0, 1, 2, 3, 4, 5], 
		delay: 3000, end: 3000 },
	{ track: "clips/11.mp3", anim: "drawings/froze.json", 
		sides: [0, 1, 4, 5], 
		delay: 5000, end: 3000 },
	{ track: "clips/12.mp3", anim: "drawings/church.json", 
		sides: [0, 1], 
		delay: 3000, end: 7000 },
	{ track: "clips/13.mp3", anim: "drawings/hell.json", 
		sides: [0, 1, 2, 3, 4, 5], 
		delay: 3000, end: 5000 },
	{ track: "clips/14.mp3", anim: "drawings/liens.json", 
		sides: [0, 1, 4, 5], 
		delay: 3000, end: 5000 },
	{ track: "clips/15.mp3", anim: "drawings/augustine.json", 
		sides: [0, 1, 4], 
		delay: 3000, end: 5000 },
	{ track: "clips/16.mp3", anim: "drawings/red_lines.json", 
		sides: [0,1,2,3,4,5], 
		delay: 3000, end: 5000 }
];

let currentDialog = 0;
let time;
let nextClip = true;

var lines = document.getElementById('lines');
let width = window.innerWidth, height = window.innerHeight; 
let linesPlayer = new LinesPlayer(lines);
let planes = [];

let phoneLines = new LinesPlayer(document.getElementById('phone'));
phoneLines.loadAnimation('drawings/phone.json');

let camera, scene, renderer, controls, cameraOffset, origin;
let linesTexture; /* texture gets updated */
let clock, mixer;
let listener, voiceSound, voiceSource, audioLoader;

let charAxes;
let char;
const charSpeed = { min: 0.3, max: 0.3 }

// better than mobile check, includes ipad
function onMotion(ev) {
	window.removeEventListener('devicemotion', onMotion, false);
	if (ev.acceleration.x != null || ev.accelerationIncludingGravity.x != null) {
		startButton.style.display = "block";
		instructions.textContent = "Headphones recommended.";
		init();
		document.addEventListener('visibilitychange', () => {
			location.reload(); // hacky for now
		});
	}
}
window.addEventListener('devicemotion', onMotion, false);

function init() {
	clock = new THREE.Clock();
	scene = new THREE.Scene();

	renderer = new THREE.WebGLRenderer();
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize(width, height);
	document.body.appendChild(renderer.domElement);
	renderer.gammaInput = true;
	renderer.gammaOutput = true;
	effect = new THREE.OutlineEffect( renderer, {
		defaultThickNess: 1,
		defaultColor: new THREE.Color( 0xffffff )
	});

	camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 1100 );
	controls = new THREE.DeviceOrientationControls( camera );
	camera.position.z = 2.5;
	camera.position.y = -1.5;
	cameraOffset = camera.position.clone();

	/* outside lines */
	lines.width =  1024;
	lines.height = 1024;
	linesTexture = new THREE.Texture(lines);
	const linesMaterial = new THREE.MeshBasicMaterial({map:linesTexture, side: THREE.DoubleSide});
	const sz = 40;
	const sides = [ /* relative x,y,z pos, rotation*/
		[0, 0,-1, 0, 0, 0], /* front face */
		[0, 0, 1, 0, Math.PI, 0], /* back face */
		
		[0, 1, 0, Math.PI/2, 0, 0], /* top face */
		[0,-1, 0, -Math.PI/2, 0, 0], /*  bottom face */

		[1, 0, 0, 0, -Math.PI/2, 0], /* right face */
		[-1,0, 0, 0, Math.PI/2, 0] /* left face */
	];

	for (let i = 0; i < sides.length; i++) {
		const side = sides[i];
		const planeGeo = new THREE.PlaneGeometry( sz * 2, sz * 2, i + 1 );
		const planeMesh = new THREE.Mesh( planeGeo, linesMaterial );
		planeMesh.position.set( side[0] * sz, side[1] * sz, side[2] * sz );
		planeMesh.rotation.set( side[3], side[4], side[5] );
		scene.add( planeMesh );
		planes.push(planeMesh);
	}

	listener = new THREE.AudioListener();
	camera.add(listener);
	audioLoader = new THREE.AudioLoader();
	voiceSound = new THREE.PositionalAudio( listener );
	bkgLoader = new THREE.AudioLoader();
	bkgMusic = new THREE.Audio( listener );

	/* blender */
	mixer = new THREE.AnimationMixer( scene );
	let loader = new THREE.JSONLoader();
	loader.load("models/char_toon.min.json", function(geometry, materials) {
		var charMat = materials[0];
		charMat.morphTargets = true;
		charMat.color.setHex(0x000000);
		charMat.skinning = true;
		char = new THREE.SkinnedMesh(geometry, charMat);
		char.position.set(0, -5, -2);
		char.scale.set(0.5,0.5,0.5);
		char.xSpeed = 0;
		char.zSpeed = 0;
		char.add(voiceSound);
		mixer.clipAction(geometry.animations[1], char)
			.play();
		scene.add(char);
		origin = char.position.clone();

		startButton.textContent = "Tap to play";
		startButton.addEventListener( 'touchend', start, false );
		startButton.addEventListener( 'click', start, false );
	});
}

function start() {
	fullscreen();
	if (document.getElementById('phone'))
		document.getElementById('phone').remove();

	if (restart) {
		currentDialog = 0;
		dialogs.map((d) => d.start = 0);
		nextClip = true;
		bkgLoader.load("clips/theme_1_80.mp3", function(buffer) {
			bkgMusic.stop();
			bkgMusic.isPlaying = false;		
			bkgMusic.setBuffer( buffer );
			bkgMusic.setLoop( true );
			bkgMusic.play();
		});
	} else {
		animate();
		bkgMusic.loop = true;
	}

	bkgLoader.load("clips/theme_1_80.mp3", function(buffer) {
		bkgMusic.setBuffer( buffer );
		bkgMusic.setLoop( true );
		bkgMusic.play();
	});

	blocker.style.display = 'none';
	
	time = performance.now() + 4000; /* beginning delay */

	linesPlayer.loadAnimation("drawings/drive.json", function() {
		// turn on dialog.sides, off others
		planes.map((p, i) => [0,1,4,5].indexOf(i) != -1 ? p.visible = true : p.visible = false);
	});

	/* for mobile to work  */
	const source = listener.context.createBufferSource();
	source.connect(listener.context.destination);
	source.start();
}

function talk(dialog) {
	nextClip = false;
	char.xSpeed = 0;
	char.zSpeed = 0;
	camera.ySpeed = Cool.random(-0.001, 0.001);
	linesPlayer.loadAnimation(dialog.anim, function() {
		// turn on dialog.sides, off others
		planes.map((p, i) => dialog.sides.indexOf(i) != -1 ? p.visible = true : p.visible = false);
	});
	audioLoader.load( dialog.track, function(buffer) {
		voiceSound.setBuffer(buffer);
		voiceSound.setRefDistance(20);
		voiceSound.play();
	});
	mixer.stopAllAction();
	const talk = talks[Math.floor(Math.random() * talks.length)];
	mixer.clipAction(char.geometry.animations[talk], char).play();

	voiceSound.onEnded = function() {
		voiceSound.isPlaying = false;
		time = performance.now() + dialog.end;
		nextClip = true;
		const nextIndex = dialogs.indexOf(dialog) + 1;
		if (nextIndex <  dialogs.length)
			currentDialog = nextIndex;
		else
			end();
	};
}

function walk() {
	mixer.stopAllAction();
	if (Math.random() > 0.3) {
		const walk = walks[Math.floor(Math.random() * walks.length)];
		mixer.clipAction(char.geometry.animations[walk], char).play();
		if (char.position.distanceTo(origin) > 10) {
			char.xSpeed = char.position.x > origin.x ? Cool.random(-charSpeed.min, 0) : Cool.random(0, charSpeed.min);
			char.zSpeed = char.position.z > origin.z ? Cool.random(-charSpeed.min, 0) : Cool.random(0, charSpeed.min);
		} else {
			char.xSpeed = Cool.random(-charSpeed.min, charSpeed.min);
			char.zSpeed = Cool.random(-charSpeed.min, charSpeed.min);
		}
		const vec = new THREE.Vector3(
			char.position.x + char.xSpeed, 
			char.position.y,
			char.position.z + char.zSpeed
		);
		char.lookAt(vec);
	} else {
		const idle = idles[Math.floor(Math.random() * idles.length)];
		mixer.clipAction(char.geometry.animations[idle], char).play();
	}
}

function end() {
	bkgLoader.load("clips/end.mp3", function(buffer) {
		bkgMusic.stop();
		bkgMusic.isPlaying = false;
		bkgMusic.setBuffer( buffer );
		bkgMusic.setLoop( false );
		bkgMusic.play();
	});
	setTimeout(function() { 
		exitFullscreen();
		restart = true;
		nextClip = false;
		blocker.style.display = 'block';
		instructions.style.display = 'block';
		startButton.textContent = "Tap to play again";
		instructions.textContent = "End of part 2";
		document.getElementById("hotdogs-link").style.display = "block";
		mixer.stopAllAction();
		const endAnim = [3, 6, 8][Cool.randomInt(0,2)];
		mixer.clipAction(char.geometry.animations[endAnim], char).play();
		char.xSpeed = 0;
		char.zSpeed = 0;
		linesPlayer.loadAnimation("drawings/liens.json", function() {
			// turn on dialog.sides, off others
			planes.map((p, i) => [0,1,4,5].indexOf(i) != -1 ? p.visible = true : p.visible = false);
		});
	}, 2000);
}

/* 0: delay, 1: play, 2: end */
function animate() {
	/* audio clips */
	if (performance.now() > time && nextClip) {
		let dialog = dialogs[currentDialog];
		if (dialog.start == 1) {
			talk(dialog);
		} else {
			dialog.start = 1;
			time += dialog.delay;
			walk();
		}
	}

    requestAnimationFrame(animate);
    linesTexture.needsUpdate = true;
    mixer.update( clock.getDelta() );
    char.position.x += char.xSpeed;
    char.position.z += char.zSpeed;
	camera.position.x = char.position.x + cameraOffset.x;
	camera.position.z = char.position.z + cameraOffset.z;
    controls.update();
   	// renderer.render(scene, camera);
   	effect.render( scene, camera );
}


function onWindowResize() { 
	width = document.documentElement.clientWidth;
	height = document.documentElement.clientHeight;
	camera.aspect = width / height;
	camera.updateProjectionMatrix();
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize(width, height);
}
window.addEventListener( 'resize', onWindowResize, false );

function fullscreen() {
	if (renderer.domElement.requestFullscreen) {
		renderer.domElement.requestFullscreen();
	} else if (renderer.domElement.msRequestFullscreen) {
		renderer.domElement.msRequestFullscreen();
	} else if (renderer.domElement.mozRequestFullScreen) {
		renderer.domElement.mozRequestFullScreen();
	} else if (renderer.domElement.webkitRequestFullscreen) {
		renderer.domElement.webkitRequestFullscreen();
	}
}

function exitFullscreen() {
	document.exitFullscreen = document.exitFullscreen || document.mozCancelFullScreen || document.webkitExitFullscreen || document.msExitFullscreen;
	if (document.exitFullscreen)
		document.exitFullscreen();
}