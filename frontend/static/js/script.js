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

document.addEventListener('DOMContentLoaded', async () => {
    const video = document.getElementById('camera-preview');
    const captureButton = document.getElementById('capture-button');
    const resetButton = document.getElementById('reset-button');
    const downloadButton = document.getElementById('download-button');
    const originalPhotoContainer = document.getElementById('original-photo-container');
    const originalPhoto = document.getElementById('original-photo');
    const capturedThumbnail = document.getElementById('captured-thumbnail');
    const thumbnailList = document.getElementById('thumbnail-list');
    const originalThumbnailContainer = document.querySelector('.thumbnail-container');
    const resizedOriginalCanvas = document.createElement('canvas');
    const resizedOriginalContext = resizedOriginalCanvas.getContext('2d');

    let stream = null;
    let originalImageDataURL = null;
    let thumbnailArray = [];
    let cameraReady = false;
    let capturedPhotos = []; // 사진 목록을 저장할 배열

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

    // 웹캠 접근
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
            video.play();
        } catch (error) {
            alert('카메라 접근 실패: ' + error);
        }
    } else {
        alert('웹캠을 지원하지 않습니다.');
    }

    // 사진 촬영 및 보정 요청
    captureButton.addEventListener('click', async () => {
        // 로딩 오버레이 표시
        const loadingOverlay = document.getElementById('loading-overlay');
        loadingOverlay.style.display = 'flex';

        // 운전면허증 사진 규격: 3.5cm x 4.5cm (350x450 픽셀)
        const canvas = document.createElement('canvas');
        canvas.width = 350;  // 운전면허증 가로 픽셀
        canvas.height = 450; // 운전면허증 세로 픽셀
        const context = canvas.getContext('2d');
        
        // 얼굴이 중앙에 오도록 비디오 프레임 계산
        const videoAspect = video.videoWidth / video.videoHeight;
        const canvasAspect = canvas.width / canvas.height;
        
        let drawWidth = video.videoWidth;
        let drawHeight = video.videoHeight;
        let startX = 0;
        let startY = 0;

        // 얼굴이 사진의 70-80%를 차지하도록 조정
        const scaleFactor = 0.75; // 얼굴 비율 75%로 설정
        
        if (videoAspect > canvasAspect) {
            drawWidth = video.videoHeight * canvasAspect;
            startX = (video.videoWidth - drawWidth) / 2;
        } else {
            drawHeight = video.videoWidth / canvasAspect;
            startY = (video.videoHeight - drawHeight) / 2;
        }

        // 캔버스에 비디오 프레임 그리기
        context.fillStyle = '#FFFFFF'; // 배경색 흰색
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(
            video,
            startX, startY, drawWidth, drawHeight,
            0, 0, canvas.width, canvas.height
        );

        const imageDataURL = canvas.toDataURL('image/jpeg', 0.95); // 고품질 JPEG

        const options = {
            upscale: true,
            scale_factor: 1.5,
            skin_smoothing: true,
            eye_enhance: true,
            remove_background: true,
            sharpness_enhance: true
        };
        
        try {
            const response = await fetch('/api/enhance_image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image_data: imageDataURL,
                    options: options
                })
            });

            if (!response.ok) {
                throw new Error('네트워크 오류: ' + response.status);
            }

            const result = await response.json();
            if (result.error) {
                alert("이미지 보정 에러: " + result.error);
            } else if (result.enhanced_image) {
                originalPhoto.src = result.enhanced_image;
                originalPhoto.style.transform = 'scaleX(-1)';
                originalPhotoContainer.style.display = 'block';
                addThumbnailToList(result.enhanced_image, imageDataURL);

                // 팝업 닫기 버튼 이벤트 (이벤트 리스너를 여기에 배치)
                const popupCloseButton = document.getElementById('popup-close');
                if (popupCloseButton) {
                    popupCloseButton.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        originalPhotoContainer.style.display = 'none';
                    });
                }

                // 팝업 다운로드 버튼 이벤트 (이벤트 리스너를 여기에 배치)
                const popupDownloadButton = document.getElementById('popup-download');
                if (popupDownloadButton) {
                    popupDownloadButton.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (originalPhoto.src && originalPhoto.src !== '#') {
                            const date = new Date();
                            const fileName = `증명사진_${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2,'0')}${date.getDate().toString().padStart(2,'0')}.jpg`;

                            // 이미지 다운로드
                            fetch(originalPhoto.src)
                                .then(response => response.blob())
                                .then(blob => {
                                    const url = window.URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = fileName;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    window.URL.revokeObjectURL(url);
                                })
                                .catch(err => {
                                    console.error('다운로드 중 오류 발생:', err);
                                    alert('이미지 다운로드 중 오류가 발생했습니다.');
                                });
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Error:', error);
            alert("이미지 보정 중 오류 발생: " + error.message);
        } finally {
            // 로딩 오버레이 숨김
            loadingOverlay.style.display = 'none';
        }
    });

    // 리셋 버튼: 보정 이미지 숨김 및 촬영된 사진 목록 초기화
    resetButton.addEventListener('click', () => {
        // 보정된 이미지 팝업 숨김 및 이미지 초기화
        originalPhotoContainer.style.display = 'none';
        originalPhoto.src = '';
        originalPhoto.style.transform = '';
        
        // 자르기 오버레이가 있다면 숨김
        if (cropOverlay) {
            cropOverlay.style.display = 'none';
        }
        
        // 촬영된 사진 목록 초기화
        thumbnailList.innerHTML = '';
        thumbnailArray = [];
        capturedPhotos = [];
    });

    // 다운로드 버튼: 이미지 파일 저장
    downloadButton.addEventListener('click', () => {
        if (originalPhoto.src && originalPhoto.src !== '#') {
            const link = document.createElement('a');
            link.href = originalPhoto.src;
            link.download = 'enhanced_photo.jpg';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            alert('다운로드할 이미지가 없습니다.');
        }
    });

    // 자르기 버튼 클릭 이벤트 핸들러
    cropButton.addEventListener('click', toggleCropMode);

    // 자르기 모드 활성화/비활성화 함수
    function toggleCropMode() {
        isCropping = !isCropping;
        cropOverlay.style.display = isCropping ? 'block' : 'none';
        video.classList.toggle('cropping', isCropping); // video 클래스 토글

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
        const containerRect = video.parentElement.getBoundingClientRect(); // camera-container
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
        const containerRect = video.parentElement.getBoundingClientRect(); // camera-container
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

    // 썸네일 목록에 썸네일 추가 함수 (originalImageDataURL 파라미터는 그대로 유지)
    function addThumbnailToList(thumbnailDataURL, originalImageDataURL) {
        thumbnailArray.push(thumbnailDataURL);

        const thumbnailItem = document.createElement('li');
        const thumbnailImage = document.createElement('img');
        thumbnailImage.src = thumbnailDataURL;
        thumbnailImage.style.transform = 'scaleX(-1)';
        thumbnailImage.alt = '촬영된 썸네일';

        // 수정: 썸네일 클릭 시 enhanced(배경 제거 적용) 이미지가 표시되도록 수정
        thumbnailImage.addEventListener('click', () => {
            originalPhoto.src = thumbnailDataURL; // enhanced 이미지 사용
            originalPhotoContainer.style.display = 'block';
        });

        thumbnailItem.appendChild(thumbnailImage);
        thumbnailList.prepend(thumbnailItem);

        if (thumbnailList.children.length > 5) {
            thumbnailList.removeChild(thumbnailList.lastElementChild);
            thumbnailArray.shift();
        }
    }

    // 팝업 관련 요소들
    const popupCloseButton = document.getElementById('popup-close');
    const popupDownloadButton = document.getElementById('popup-download');  

    // 팝업 배경 클릭 시 닫기
    originalPhotoContainer.addEventListener('click', (e) => {
        if (e.target === originalPhotoContainer) {
            originalPhotoContainer.style.display = 'none';
        }
    });

    // 이미지 로드 오류 처리
    originalPhoto.addEventListener('error', () => {
        console.error('이미지 로드 실패');
        originalPhotoContainer.style.display = 'none';
        alert('이미지를 불러오는데 실패했습니다.');
    });
});