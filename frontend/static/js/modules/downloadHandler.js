export class DownloadHandler {
  static async download(dataURL, filename = 'image.jpg') {
    // dataURL을 Blob으로 변환합니다.
    const blob = DownloadHandler.dataURLtoBlob(dataURL);
    // Blob URL 생성
    const url = URL.createObjectURL(blob);
    
    // 임시 <a> 태그를 생성하여 다운로드 트리거
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // 사용한 URL 해제
    URL.revokeObjectURL(url);
  }

  static dataURLtoBlob(dataURL) {
    const arr = dataURL.split(',');
    // MIME 타입 추출 (없으면 기본 이미지 타입으로 설정)
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }
}