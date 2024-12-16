const video2 = document.getElementsByClassName('input_video2')[0];
const out2 = document.getElementsByClassName('output2')[0];
const controlsElement2 = document.getElementsByClassName('control2')[0];
const canvasCtx = out2.getContext('2d');

const fpsControl = new FPS();
const spinner = document.querySelector('.loading');
spinner.ontransitionend = () => {
  spinner.style.display = 'none';
};

// 画像の参照
const faceImage = new Image();
const eyeImage = new Image();
const mouthUImage = new Image();
const mouthDImage = new Image();
const mouthIImage = new Image();

const bodyImage = new Image();
const wingImage = new Image();

const haikeiImage = new Image();

// 画像のパスを設定
faceImage.src = 'js/img/Otan/face.PNG';  // 適切なパスに変更
eyeImage.src = 'js/img/Otan/eye.PNG';
mouthUImage.src = 'js/img/Otan/mouthU.PNG';
mouthDImage.src = 'js/img/Otan/mouthD.PNG';
mouthIImage.src = 'js/img/Otan/mouthI.PNG';

bodyImage.src = 'js/img/Otan/body.PNG';
//wingImage.src = 'js/img/Meito/wing.PNG';

haikeiImage.src = 'js/img/Haikei.PNG';

// 画像がすべて読み込まれてから描画を開始
Promise.all([
  new Promise(resolve => faceImage.onload = resolve),
  new Promise(resolve => eyeImage.onload = resolve),
  new Promise(resolve => mouthUImage.onload = resolve),
  new Promise(resolve => mouthDImage.onload = resolve),
  new Promise(resolve => mouthIImage.onload = resolve)
]).then(() => {
  console.log('All images loaded');
  startFaceMesh();
}).catch(error => {
  console.error('Error loading images:', error);
});

function startFaceMesh() {
  const faceMesh = new FaceMesh({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.1/${file}`;
  }});

  faceMesh.onResults(onResultsFaceMesh);

  const camera = new Camera(video2, {
    onFrame: async () => {
      await faceMesh.send({image: video2});
    },
    width: 480,
    height: 480
  });
  camera.start();

  // その他の初期化コード
  new ControlPanel(controlsElement2, {
    selfieMode: true,
    maxNumFaces: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  })
  .add([
    new StaticText({title: 'MediaPipe Face Mesh'}),
    fpsControl,
    new Toggle({title: 'Selfie Mode', field: 'selfieMode'}),
    new Slider({
      title: 'Max Number of Faces',
      field: 'maxNumFaces',
      range: [1, 4],
      step: 1
    }),
    new Slider({
      title: 'Min Detection Confidence',
      field: 'minDetectionConfidence',
      range: [0, 1],
      step: 0.01
    }),
    new Slider({
      title: 'Min Tracking Confidence',
      field: 'minTrackingConfidence',
      range: [0, 1],
      step: 0.01
    }),
  ])
  .on(options => {
    video2.classList.toggle('selfie', options.selfieMode);
    faceMesh.setOptions(options);
  });
}


function onResultsFaceMesh(results) {
  document.body.classList.add('loaded');
  fpsControl.tick();

  canvasCtx.save();
  canvasCtx.clearRect(0, 0, out2.width, out2.height);
  //canvasCtx.drawImage(results.image, 0, 0, out2.width, out2.height);

  if (results.multiFaceLandmarks) {
    for (const landmarks of results.multiFaceLandmarks) {
      // 画像描画関数を呼び出す
      drawIllustration(canvasCtx, landmarks);

      // メッシュ描画（デバッグ用）
      /*
      drawConnectors(
        canvasCtx, landmarks, FACEMESH_TESSELATION,
        { color: '#000000', lineWidth: 1 }
      );
      */
    }
  }

  canvasCtx.restore();
}



// 顔パーツを描画する関数
function drawIllustration(canvasCtx, landmarks) {
  const canvasWidth = out2.width;
  const canvasHeight = out2.height;

  //canvasCtx.drawImage(haikeiImage, 0, 0, canvasWidth, canvasHeight);

  canvasCtx.drawImage(bodyImage, 0, 300, canvasWidth, canvasHeight);

  // 顔全体のバウンディングボックスを取得
  const faceLandmarks = landmarks.slice(0, 468); // 顔のランドマーク（468個）
  const bounds = getBoundingBox(faceLandmarks, canvasWidth, canvasHeight);

  // 顔のバウンディングボックスに合わせて顔画像をスケーリング
  const faceWidth = bounds.width;
  const faceHeight = bounds.height;
  const faceX = bounds.x;
  const faceY = bounds.y;

  // 顔全体を描画（顔の輪郭に合わせてサイズと位置を調整）
  canvasCtx.drawImage(
    faceImage,
    faceX -100, 
    faceY -100, 
    faceWidth * 2, 
    faceHeight * 2
  );

  // 左目と右目のランドマークを取得
  const leftEyeTop = landmarks[159]; // 左目の上瞼
  const leftEyeBottom = landmarks[145]; // 左目の下瞼
  const rightEyeTop = landmarks[386]; // 右目の上瞼
  const rightEyeBottom = landmarks[374]; // 右目の下瞼

  // 目の開き具合を計算
  const leftEyeHeight = Math.abs(leftEyeTop.y - leftEyeBottom.y);
  const rightEyeHeight = Math.abs(rightEyeTop.y - rightEyeBottom.y);

  // 閉じ具合の計算：目が閉じているほど小さな値になる
  const eyeCloseFactorLeft = Math.max(0, 1 - leftEyeHeight * 3); // 閉じ具合の補正（スケーリング）
  const eyeCloseFactorRight = Math.max(0, 1 - rightEyeHeight * 3);

  // 目のイラストの高さを調整（縮小・拡大）
  const eyeScaleLeft = eyeCloseFactorLeft * 50; // 目の最大高さ50px
  const eyeScaleRight = eyeCloseFactorRight * 50;

  // 目を描画（スケーリングを調整）
  const leftEye = landmarks[362]; // 左目中心
  const rightEye = landmarks[33]; // 右目中心

  canvasCtx.drawImage(
    eyeImage,
    leftEye.x * canvasWidth - eyeScaleLeft / 2, // x座標調整
    leftEye.y * canvasHeight - eyeScaleLeft / 2, // y座標調整
    100, // 横幅を目の開き具合で調整
    leftEyeHeight * 5000  // 高さも調整
  );
  canvasCtx.drawImage(
    eyeImage,
    rightEye.x * canvasWidth - eyeScaleRight / 2,
    rightEye.y * canvasHeight - eyeScaleRight / 2,
    100,
    rightEyeHeight * 5000
  );

// 左目と右目のランドマークを取得
const mouthTop = landmarks[13]; // 上唇の
const mouthBottom = landmarks[14]; // 下唇の

// 目の開き具合を計算
const mouthHeight = Math.abs(mouthTop.y - mouthBottom.y);

// 閉じ具合の計算：目が閉じているほど小さな値になる
const mouthCloseFactor = Math.max(0, 1 - mouthHeight * 3); // 閉じ具合の補正（スケーリング）

// 目のイラストの高さを調整（縮小・拡大）
const mouthScaleLeft = mouthCloseFactor * 50; // 目の最大高さ50px

// 目を描画（スケーリングを調整）
const mouthIn = landmarks[13]; // 左目中心

canvasCtx.drawImage(
  mouthIImage,
  mouthIn.x * canvasWidth - mouthScaleLeft / 2 -30, // x座標調整
  mouthIn.y * canvasHeight - mouthScaleLeft / 2 + 40, // y座標調整
  100 * 1.2, // 横幅を目の開き具合で調整
  mouthHeight * 700  // 高さも調整
);





  // 下唇
  const lowerLip = landmarks[14]; // 下唇中心
  canvasCtx.drawImage(
    mouthDImage,
    lowerLip.x * canvasWidth - 50,
    lowerLip.y * canvasHeight -20,
    120,
    120
  );

  // 上唇
  const upperLip = landmarks[13]; // 上唇中心
  canvasCtx.drawImage(
    mouthUImage,
    upperLip.x * canvasWidth - 65,
    upperLip.y * canvasHeight - 80,
    150,
    200
  );
}

// 顔のバウンディングボックスを取得する関数
function getBoundingBox(landmarks, canvasWidth, canvasHeight) {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  // 顔のランドマークをループして最小/最大のx, y座標を見つける
  for (let i = 0; i < landmarks.length; i++) {
    const x = landmarks[i].x * canvasWidth;
    const y = landmarks[i].y * canvasHeight;

    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  // バウンディングボックスを返す
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}


/*
const faceMesh = new FaceMesh({locateFile: (file) => {
  return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.1/${file}`;
}});
faceMesh.onResults(onResultsFaceMesh);

//カメラが動く
const camera = new Camera(video2, {
  onFrame: async () => {
    await faceMesh.send({image: video2});
  },
  width: 480,
  height: 480
});
camera.start();
*/

//カメラが動く
document.getElementById('cameraS').addEventListener('click', () => {
  const camera = new Camera(video2, {
    onFrame: async () => {
      await faceMesh.send({image: video2});
    },
    width: 480,
    height: 480
  });
  camera.start();
});

// カメラ停止用ボタンの処理
document.getElementById('cameraB').addEventListener('click', () => {
  const stream = video2.srcObject; // video要素に設定されたストリームを取得
  if (stream) {
    const tracks = stream.getTracks(); // ストリーム内のトラックを取得
    tracks.forEach(track => track.stop()); // すべてのトラックを停止
    console.log('Camera stopped.');
  } else {
    console.log('No active stream found.');
  }
});

new ControlPanel(controlsElement2, {
      selfieMode: true,
      maxNumFaces: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    })
    .add([
      new StaticText({title: 'MediaPipe Face Mesh'}),
      fpsControl,
      new Toggle({title: 'Selfie Mode', field: 'selfieMode'}),
      new Slider({
        title: 'Max Number of Faces',
        field: 'maxNumFaces',
        range: [1, 4],
        step: 1
      }),
      new Slider({
        title: 'Min Detection Confidence',
        field: 'minDetectionConfidence',
        range: [0, 1],
        step: 0.01
      }),
      new Slider({
        title: 'Min Tracking Confidence',
        field: 'minTrackingConfidence',
        range: [0, 1],
        step: 0.01
      }),
    ])
    .on(options => {
      video2.classList.toggle('selfie', options.selfieMode);
      faceMesh.setOptions(options);
    });