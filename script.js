// CanvasRenderingContext2D.roundRect 폴리필 (IE, Edge, Safari 지원)
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, width, height, radius) {
        if (radius === undefined) {
            radius = 5;
        }
        this.beginPath();
        this.moveTo(x + radius, y);
        this.lineTo(x + width - radius, y);
        this.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.lineTo(x + width, y + height - radius);
        this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.lineTo(x + radius, y + height);
        this.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.lineTo(x, y + radius);
        this.quadraticCurveTo(x, y, x + radius, y);
        this.closePath();
        return this;
    };
}

document.addEventListener('DOMContentLoaded', () => {
    const cameraPreview = document.getElementById('camera-preview');
    const captureButton = document.getElementById('capture-button');
    const capturedThumbnail = document.getElementById('captured-thumbnail');
    const originalPhoto = document.getElementById('original-photo');
    const originalPhotoContainer = document.getElementById('original-photo-container');
    const resetButton = document.getElementById('reset-button');
    const captureCanvasContext = document.createElement('canvas').getContext('2d');
    const originalCanvasContext = document.createElement('canvas').getContext('2d');
    const thumbnailList = document.getElementById('thumbnail-list');
    const originalThumbnailContainer = document.querySelector('.thumbnail-container');
    const resizedOriginalCanvas = document.createElement('canvas');
    const resizedOriginalContext = resizedOriginalCanvas.getContext('2d');

    let stream = null;
    let originalImageDataURL = null;
    let thumbnailArray = [];
    let cameraReady = false;

    // 자르기 기능 관련 변수
    const cropButton = document.getElementById('crop-button');
    const cropOverlay = document.getElementById('crop-overlay');
    const cropBox = document.getElementById('crop-box');
    let isCropping = false; // 자르기 모드 활성화 여부
    let isDraggingCrop = false; // 자르기 영역 드래그 중 여부
    let isResizingCrop = false; // 자르기 영역 리사이즈 중 여부
    let currentHandle = null; // 현재 잡고 있는 핸들
    let cropStartX, cropStartY; // 드래그 시작 좌표
    let cropBoxStartX, cropBoxStartY, cropBoxStartWidth, cropBoxStartHeight; // 리사이즈/드래그 시작 시 자르기 박스 정보

    // 카메라 시작 함수
    async function startCamera() {
        try {
            if (stream) {
                return;
            }
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            cameraPreview.srcObject = stream;
            cameraPreview.style.transform = 'scaleX(-1)';

            cameraPreview.addEventListener('loadedmetadata', () => {
                cameraReady = true;
            });

        } catch (error) {
            alert('카메라 접근에 실패했습니다. 카메라 권한을 확인해주세요.');
        }
    }

    // 사진 촬영 함수 수정
    function capturePhoto() {
        if (!cameraReady) {
            alert('카메라 준비 중입니다. 잠시만 기다려주세요.');
            return;
        }

        // 캔버스 크기 및 반전 설정 (캡처용)
        captureCanvasContext.canvas.width = cameraPreview.videoWidth;
        captureCanvasContext.canvas.height = cameraPreview.videoHeight;
        captureCanvasContext.scale(-1, 1);
        captureCanvasContext.translate(-captureCanvasContext.canvas.width, 0);
        captureCanvasContext.drawImage(cameraPreview, 0, 0, captureCanvasContext.canvas.width, captureCanvasContext.canvas.height);
        captureCanvasContext.restore(); // save/restore 로 캔버스 상태 관리


        // 원본 사진 캔버스에 리사이징 및 그리기 (350x450)
        const originalImageWidth = 350;
        const originalImageHeight = 450;
        originalCanvasContext.canvas.width = originalImageWidth;
        originalCanvasContext.canvas.height = originalImageHeight;

        // 캔버스 context resetTransform() 추가 (save/restore 대신)
        originalCanvasContext.resetTransform();
        originalCanvasContext.scale(-1, 1);
        originalCanvasContext.translate(-originalCanvasContext.canvas.width, 0);


        // 이미지 비율 유지하면서 캔버스에 맞게 리사이징
        const videoRatio = cameraPreview.videoWidth / cameraPreview.videoHeight;
        const canvasRatio = originalImageWidth / originalImageHeight;
        let drawWidth = originalImageWidth;
        let drawHeight = originalImageHeight;
        let drawX = 0;
        let drawY = 0;

        if (videoRatio > canvasRatio) {
            // 비디오 가로가 더 넓은 경우, 캔버스 높이에 맞춰서 자르기
            drawHeight = originalImageHeight;
            drawWidth = originalImageHeight * videoRatio;
            drawX = (originalImageWidth - drawWidth) / 2;
        } else {
            // 비디오 세로가 더 긴 경우, 캔버스 너비에 맞춰서 자르기
            drawWidth = originalImageWidth;
            drawHeight = originalImageWidth / videoRatio;
            drawY = (originalImageHeight - drawHeight) / 2;
        }


        originalCanvasContext.drawImage(
            cameraPreview,
            0, 0, cameraPreview.videoWidth, cameraPreview.videoHeight, // source image 영역
            drawX, drawY, drawWidth, drawHeight // destination canvas 영역
        );


        originalImageDataURL = originalCanvasContext.canvas.toDataURL('image/jpeg');

        if (!originalImageDataURL) {
            return;
        }

        const thumbnailWidth = 84;  // 3.5cm -> 픽셀 (96DPI 기준)
        const thumbnailHeight = 105; // 4.5cm -> 픽셀 (96DPI 기준)

        captureCanvasContext.canvas.width = thumbnailWidth;
        captureCanvasContext.canvas.height = thumbnailHeight;
        captureCanvasContext.resetTransform(); // 썸네일 캔버스 변환 초기화
        captureCanvasContext.drawImage(
            originalCanvasContext.canvas, // Resized original canvas 사용
            0, 0, originalCanvasContext.canvas.width, originalCanvasContext.canvas.height,
            0, 0, thumbnailWidth, thumbnailHeight
        );


        const thumbnailDataURL = captureCanvasContext.canvas.toDataURL('image/jpeg');

        addThumbnailToList(thumbnailDataURL, originalImageDataURL); // originalImageDataURL 전달
    }

    // 썸네일 목록에 썸네일 추가 함수 (originalImageDataURL 파라미터 추가)
    function addThumbnailToList(thumbnailDataURL, originalImageDataURL) {
        thumbnailArray.push(thumbnailDataURL);

        const thumbnailItem = document.createElement('li');
        const thumbnailImage = document.createElement('img');
        thumbnailImage.src = thumbnailDataURL;
        thumbnailImage.alt = '촬영된 썸네일';

        thumbnailImage.addEventListener('click', () => {
            originalPhoto.src = originalImageDataURL; // 썸네일 클릭 시 원본 사진 Data URL 사용
            originalPhotoContainer.style.display = 'flex';
        });

        thumbnailItem.appendChild(thumbnailImage);
        thumbnailList.prepend(thumbnailItem);

        if (thumbnailList.children.length > 5) {
            thumbnailList.removeChild(thumbnailList.lastElementChild);
            thumbnailArray.shift();
        }
    }

    // 원본 사진 컨테이너 클릭 시 닫기 이벤트 리스너
    originalPhotoContainer.addEventListener('click', () => {
        originalPhotoContainer.style.display = 'none';
    });

    // 자르기 버튼 클릭 이벤트 핸들러
    cropButton.addEventListener('click', toggleCropMode);

    // 자르기 모드 활성화/비활성화 함수
    function toggleCropMode() {
        isCropping = !isCropping;
        cropOverlay.style.display = isCropping ? 'block' : 'none';
        cameraArea.classList.toggle('cropping', isCropping); // cameraArea 클래스 토글

        if (isCropping) {
            // 자르기 모드 활성화 시, 이벤트 리스너 추가
            cropOverlay.addEventListener('mousedown', startCrop);
            cropOverlay.addEventListener('mousemove', dragCrop);
            cropOverlay.addEventListener('mouseup', endCrop);

            cropBox.querySelectorAll('.crop-handle').forEach(handle => {
                handle.addEventListener('mousedown', startResizeCrop);
                handle.addEventListener('mousemove', resizeCrop);
                handle.addEventListener('mouseup', endResizeCrop);
            });
        } else {
            // 자르기 모드 비활성화 시, 이벤트 리스너 제거
            cropOverlay.removeEventListener('mousedown', startCrop);
            cropOverlay.removeEventListener('mousemove', dragCrop);
            cropOverlay.removeEventListener('mouseup', endCrop);

            cropBox.querySelectorAll('.crop-handle').forEach(handle => {
                handle.removeEventListener('mousedown', startResizeCrop);
                handle.removeEventListener('mousemove', resizeCrop);
                handle.removeEventListener('mouseup', endResizeCrop);
            });
        }
    }

    // 자르기 영역 드래그 시작
    function startCrop(e) {
        if (e.target !== cropBox) return; // crop-box 내부에서만 드래그 시작

        isDraggingCrop = true;
        cropStartX = e.clientX;
        cropStartY = e.clientY;
        cropBoxStartX = cropBox.offsetLeft;
        cropBoxStartY = cropBox.offsetTop;
    }

    // 자르기 영역 드래그 중
    function dragCrop(e) {
        if (!isDraggingCrop) return;

        const offsetX = e.clientX - cropStartX;
        const offsetY = e.clientY - cropStartY;

        let newX = cropBoxStartX + offsetX;
        let newY = cropBoxStartY + offsetY;

        // crop box 가 camera-container 영역을 벗어나지 않도록 제한
        const containerRect = cameraPreview.parentElement.getBoundingClientRect(); // camera-container
        const boxRect = cropBox.getBoundingClientRect();
        const maxX = containerRect.width - boxRect.width;
        const maxY = containerRect.height - boxRect.height;
        const minX = 0;
        const minY = 0;

        newX = Math.max(minX, Math.min(newX, maxX));
        newY = Math.max(minY, Math.min(newY, maxY));


        cropBox.style.left = `${newX}px`;
        cropBox.style.top = `${newY}px`;
    }

    // 자르기 영역 드래그 종료
    function endCrop() {
        isDraggingCrop = false;
    }

    // 자르기 영역 리사이즈 시작
    function startResizeCrop(e) {
        isResizingCrop = true;
        currentHandle = e.target;
        cropStartX = e.clientX;
        cropStartY = e.clientY;
        cropBoxStartX = cropBox.offsetLeft;
        cropBoxStartY = cropBox.offsetTop;
        cropBoxStartWidth = cropBox.offsetWidth;
        cropBoxStartHeight = cropBox.offsetHeight;
        e.stopPropagation(); // 드래그 이벤트 방지
    }

    // 자르기 영역 리사이즈 중
    function resizeCrop(e) {
        if (!isResizingCrop) return;

        const offsetX = e.clientX - cropStartX;
        const offsetY = e.clientY - cropStartY;

        let newWidth = cropBoxStartWidth;
        let newHeight = cropBoxStartHeight;
        let newX = cropBoxStartX;
        let newY = cropBoxStartY;

        const minWidth = 50;
        const minHeight = 50;

        switch (currentHandle.classList[1]) {
            case 'top-left':
                newWidth = cropBoxStartWidth - offsetX;
                newHeight = cropBoxStartHeight - offsetY;
                newX = cropBoxStartX + offsetX;
                newY = cropBoxStartY + offsetY;
                break;
            case 'top-right':
                newWidth = cropBoxStartWidth + offsetX;
                newHeight = cropBoxStartHeight - offsetY;
                newY = cropBoxStartY + offsetY;
                break;
            case 'bottom-left':
                newWidth = cropBoxStartWidth - offsetX;
                newHeight = cropBoxStartHeight + offsetY;
                newX = cropBoxStartX + offsetX;
                break;
            case 'bottom-right':
                newWidth = cropBoxStartWidth + offsetX;
                newHeight = cropBoxStartHeight + offsetY;
                break;
        }

        // 최소 크기 제한
        newWidth = Math.max(minWidth, newWidth);
        newHeight = Math.max(minHeight, newHeight);

        // crop box 가 camera-container 영역을 벗어나지 않도록 제한 (리사이즈 시 오른쪽/아래쪽만)
        const containerRect = cameraPreview.parentElement.getBoundingClientRect(); // camera-container
        const maxX = containerRect.width - newWidth;
        const maxY = containerRect.height - newHeight;

        newWidth = Math.min(newWidth, containerRect.width - cropBoxStartX); // 오른쪽 경계 제한
        newHeight = Math.min(newHeight, containerRect.height - cropBoxStartY); // 아래쪽 경계 제한


        // top-left, top-right 핸들로 리사이즈 시 top, left 위치 변경 및 영역 벗어남 방지
        if (currentHandle.classList.contains('top-left') || currentHandle.classList.contains('top-right')) {
            newY = Math.max(0, newY); // top 경계 제한
            if (newY === 0 && currentHandle.classList.contains('top-left')) {
                newHeight = cropBoxStartHeight + cropBoxStartY; // top 이 0 이 되면 height 를 늘려줌
            }
        }
        if (currentHandle.classList.contains('top-left') || currentHandle.classList.contains('bottom-left')) {
            newX = Math.max(0, newX); // left 경계 제한
             if (newX === 0 && currentHandle.classList.contains('top-left')) {
                newWidth = cropBoxStartWidth + cropBoxStartX; // left 가 0 이 되면 width 를 늘려줌
            }
        }


        cropBox.style.width = `${newWidth}px`;
        cropBox.style.height = `${newHeight}px`;
        cropBox.style.left = `${newX}px`;
        cropBox.style.top = `${newY}px`;
    }


    // 자르기 영역 리사이즈 종료
    function endResizeCrop() {
        isResizingCrop = false;
        currentHandle = null;
    }

    // 이벤트 리스너 등록
    captureButton.addEventListener('click', capturePhoto);
    startCamera();

    // 초기화 함수
    function reset촬영() {
        thumbnailList.innerHTML = '';
        thumbnailArray = [];
        originalPhoto.src = '#';
        originalPhotoContainer.style.display = 'none';
        captureCanvasContext.clearRect(0, 0, captureCanvasContext.canvas.width, captureCanvasContext.canvas.height);
        originalImageDataURL = null;
        originalThumbnailContainer.style.display = 'none';
    }

    // "다시 찍기" 버튼 클릭 이벤트 리스너
    resetButton.addEventListener('click', reset촬영);

    // 이미지 로드 오류 처리
    originalPhoto.addEventListener('error', () => {
        originalPhotoContainer.style.display = 'none';
    });
});