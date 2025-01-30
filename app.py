from flask import Flask, request, jsonify
from PIL import Image, ImageEnhance, ImageFilter
import io
import base64
import cv2
import numpy as np

app = Flask(__name__)

def advanced_face_enhancement(image_pil, options):
    # OpenCV 변환
    image_cv = np.array(image_pil)
    image_cv = cv2.cvtColor(image_cv, cv2.COLOR_RGB2BGR)
    
    # 얼굴 인식
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalfacealt.xml')
    gray = cv2.cvtColor(image_cv, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.1, 4)

    for (x, y, w, h) in faces:
        # 피부 보정
        if options.get('skin_smoothing', False):
            face_roi = image_cv[y:y+h, x:x+w]
            face_roi = cv2.bilateralFilter(face_roi, 9, 75, 75)
            image_cv[y:y+h, x:x+w] = face_roi

        # 눈 보정
        if options.get('eye_enhance', False):
            eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
            eyes = eye_cascade.detectMultiScale(gray[y:y+h, x:x+w])
            for (ex, ey, ew, eh) in eyes:
                eye_roi = image_cv[y+ey:y+ey+eh, x+ex:x+ex+ew]
                eye_roi = cv2.addWeighted(eye_roi, 1.5, np.zeros(eye_roi.shape, eye_roi.dtype), 0, 20)
                image_cv[y+ey:y+ey+eh, x+ex:x+ex+ew] = eye_roi

    # PIL 이미지로 변환
    return Image.fromarray(cv2.cvtColor(image_cv, cv2.COLOR_BGR2RGB))

@app.route('/api/enhance_image', methods=['POST'])
def enhance_image():
    try:
        data = request.json
        image_data = data['image_data']
        options = data.get('options', {})
        
        # 이미지 디코딩
        image_bytes = base64.b64decode(image_data.split(',')[1])
        image = Image.open(io.BytesIO(image_bytes))
        
        # 고급 보정 처리
        enhanced_image = advanced_face_enhancement(image, options)
        
        # 이미지 인코딩
        buffered = io.BytesIO()
        enhanced_image.save(buffered, format="JPEG", quality=95)
        return jsonify({
            'enhanced_image': f"data:image/jpeg;base64,{base64.b64encode(buffered.getvalue()).decode()}"
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True) # 개발 모드, 실제 배포 시 debug=False 로 변경 