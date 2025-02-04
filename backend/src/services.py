from flask import request
from PIL import Image, ImageEnhance, ImageFilter
import io
import base64
import cv2
import numpy as np
from rembg import remove

def process_image(request):
    try:
        # 이미지 검증 강화
        if not request.is_json or 'image_data' not in request.json:
            return {'error': 'Invalid request'}, 400
            
        image_data = request.json['image_data']
        if not image_data.startswith('data:image/jpeg;base64,'):
            return {'error': 'Only JPEG supported'}, 400

        # 이미지 디코딩
        image = decode_image(image_data)
        
        # 처리 파이프라인: advanced_face_enhancement 함수 활용
        options = request.json.get('options', {})
        # 모든 옵션을 기본 True로 설정 (추가 보정 기능 자동 적용)
        options.setdefault('remove_background', True)
        options.setdefault('upscale', True)
        options.setdefault('skin_smoothing', True)
        options.setdefault('eye_enhance', True)
        options.setdefault('sharpness_enhance', True)
        processed_image = advanced_face_enhancement(image, options)
        
        # 결과 인코딩
        buffered = io.BytesIO()
        processed_image.save(buffered, format="JPEG", quality=95, optimize=True)
        encoded_image = base64.b64encode(buffered.getvalue()).decode('utf-8')
        
        return {
            'enhanced_image': f'data:image/jpeg;base64,{encoded_image}',
            'metadata': {
                'format': 'JPEG',
                'dimensions': processed_image.size,
                'size': len(encoded_image)
            }
        }

    except Exception as e:
        return {'error': str(e)}, 500

def advanced_face_enhancement(image_pil, options):
    try:
        # 배경 제거 검증
        if not options.get('remove_background', False):
            raise ValueError('Background removal is required')

        # OpenCV 변환
        try:
            image_cv = np.array(image_pil)
            image_cv = cv2.cvtColor(image_cv, cv2.COLOR_RGB2BGR)
        except Exception as e:
            print(f"Error in OpenCV conversion: {e}")
            return image_pil

        # 업스케일링
        try:
            if options.get('upscale', False):
                scale_factor = options.get('scale_factor', 2)  # 기본 스케일 2배
                height, width = image_cv.shape[:2]
                new_height, new_width = int(height * scale_factor), int(width * scale_factor)
                image_cv = cv2.resize(image_cv, (new_width, new_height), interpolation=cv2.INTER_CUBIC)
        except Exception as e:
            print(f"Error in upscaling: {e}")
            return Image.fromarray(cv2.cvtColor(image_cv, cv2.COLOR_BGR2RGB))

        # 피부 보정
        try:
            if options.get('skin_smoothing', False):
                image_cv = cv2.bilateralFilter(image_cv, 9, 75, 75)
        except Exception as e:
            print(f"Error in skin smoothing: {e}")
            return Image.fromarray(cv2.cvtColor(image_cv, cv2.COLOR_BGR2RGB))

        # 눈 보정
        try:
            if options.get('eye_enhance', False):
                image_cv = cv2.addWeighted(image_cv, 1.1, np.zeros(image_cv.shape, image_cv.dtype), 0, 20)
        except Exception as e:
            print(f"Error in eye enhancement: {e}")
            return Image.fromarray(cv2.cvtColor(image_cv, cv2.COLOR_BGR2RGB))
        
        # 배경 제거
        try:
            if options.get('remove_background', False):
                image_pil = remove_background_rembg(image_pil)
                image_cv = np.array(image_pil)
                image_cv = cv2.cvtColor(image_cv, cv2.COLOR_RGB2BGR)
        except Exception as e:
            print(f"Error in background removal: {e}")
            return Image.fromarray(cv2.cvtColor(image_cv, cv2.COLOR_BGR2RGB))

        # PIL 이미지로 변환 및 선명도 개선 (sharpness enhancement)
        try:
            result_image = Image.fromarray(cv2.cvtColor(image_cv, cv2.COLOR_BGR2RGB))
            if options.get('sharpness_enhance', True):
                sharpener = ImageEnhance.Sharpness(result_image)
                # 향상 계수는 필요에 따라 조정 가능. 2.0을 기본값으로 사용합니다.
                result_image = sharpener.enhance(2.0)
            return result_image
        except Exception as e:
            print(f"Error in PIL conversion: {e}")
            return image_pil

        # 결과 이미지 검증
        if result_image.mode != 'RGB':
            result_image = result_image.convert('RGB')

        if result_image.size != (350, 450):
            result_image = result_image.resize((350, 450), Image.LANCZOS)

        return result_image

    except Exception as e:
        print(f'Enhancement Error: {str(e)}')
        raise

def remove_background_rembg(image_pil):
    try:
        # Use the image in its original RGB order for rembg
        image_np = np.array(image_pil)
        output_np = remove(image_np)

        # If the output has an alpha channel, perform alpha blending with a white background
        if output_np.shape[2] == 4:
            alpha = output_np[:, :, 3] / 255.0
            foreground = output_np[:, :, :3].astype(float)
            background = np.ones_like(foreground) * 255
            blended = foreground * alpha[:, :, None] + background * (1 - alpha[:, :, None])
            blended = blended.astype(np.uint8)
            return Image.fromarray(blended)
        else:
            return Image.fromarray(output_np)
    except Exception as e:
        print(f"Error in rembg background removal: {e}")
        return image_pil

def decode_image(image_data):
    try:
        header, encoded = image_data.split(",", 1)
        image_bytes = base64.b64decode(encoded)
        image = Image.open(io.BytesIO(image_bytes))
        return image
    except Exception as e:
        print(f"Error in image decoding: {str(e)}")
        raise