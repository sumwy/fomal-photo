"""
이미지 캐싱 기능을 제공하는 모듈
처리된 이미지를 캐싱하여 동일한 이미지에 대한 중복 처리를 방지합니다.
"""

import os
import hashlib
import pickle
import time
import logging
from functools import lru_cache
from typing import Dict, Any, Union, Optional, Tuple, Callable

# 로깅 설정
logger = logging.getLogger(__name__)

# 캐시 설정
CACHE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'cache')
MAX_CACHE_SIZE = 500  # 최대 캐시 항목 수
CACHE_EXPIRY = 86400  # 캐시 만료 시간 (초) - 24시간

# 캐시 디렉토리 생성
os.makedirs(CACHE_DIR, exist_ok=True)

class ImageCache:
    """이미지 캐싱 클래스"""
    
    def __init__(self, cache_dir: str = CACHE_DIR, max_size: int = MAX_CACHE_SIZE, expiry: int = CACHE_EXPIRY):
        """
        이미지 캐시 초기화
        
        Args:
            cache_dir: 캐시 디렉토리 경로
            max_size: 최대 캐시 항목 수
            expiry: 캐시 만료 시간 (초)
        """
        self.cache_dir = cache_dir
        self.max_size = max_size
        self.expiry = expiry
        os.makedirs(self.cache_dir, exist_ok=True)
        self._clean_expired_cache()

    def _compute_hash(self, image_data: str, options: Dict[str, Any]) -> str:
        """
        이미지 데이터와 처리 옵션을 기반으로 해시값 계산
        
        Args:
            image_data: 이미지 데이터
            options: 처리 옵션
            
        Returns:
            해시값 문자열
        """
        # 이미지 데이터에서 헤더 제거
        if ',' in image_data:
            image_data = image_data.split(',')[1]
            
        # 옵션을 정렬된 문자열로 변환
        options_str = str(sorted(options.items()))
        
        # 이미지 데이터와 옵션 문자열 해싱
        hash_input = image_data[:1000] + options_str  # 이미지 데이터는 앞부분만 사용하여 성능 향상
        return hashlib.md5(hash_input.encode('utf-8')).hexdigest()
    
    def _get_cache_path(self, cache_key: str) -> str:
        """
        캐시 키에 해당하는 파일 경로 반환
        
        Args:
            cache_key: 캐시 키
            
        Returns:
            캐시 파일 경로
        """
        return os.path.join(self.cache_dir, f"{cache_key}.pkl")
    
    def get(self, image_data: str, options: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        캐시에서 이미지 처리 결과 조회
        
        Args:
            image_data: 이미지 데이터
            options: 처리 옵션
            
        Returns:
            캐시된 처리 결과 또는 None (캐시 미스)
        """
        cache_key = self._compute_hash(image_data, options)
        cache_path = self._get_cache_path(cache_key)
        
        if not os.path.exists(cache_path):
            logger.debug(f"Cache miss for key: {cache_key[:8]}...")
            return None
            
        try:
            with open(cache_path, 'rb') as f:
                cache_data = pickle.load(f)
                
            # 만료 확인
            if time.time() - cache_data.get('timestamp', 0) > self.expiry:
                logger.debug(f"Cache expired for key: {cache_key[:8]}...")
                os.remove(cache_path)
                return None
                
            logger.debug(f"Cache hit for key: {cache_key[:8]}...")
            return cache_data.get('result')
            
        except Exception as e:
            logger.error(f"Error reading cache: {str(e)}")
            if os.path.exists(cache_path):
                os.remove(cache_path)
            return None
    
    def set(self, image_data: str, options: Dict[str, Any], result: Dict[str, Any]) -> None:
        """
        이미지 처리 결과를 캐시에 저장
        
        Args:
            image_data: 이미지 데이터
            options: 처리 옵션
            result: 처리 결과
        """
        try:
            cache_key = self._compute_hash(image_data, options)
            cache_path = self._get_cache_path(cache_key)
            
            cache_data = {
                'timestamp': time.time(),
                'result': result,
                'options': options
            }
            
            with open(cache_path, 'wb') as f:
                pickle.dump(cache_data, f)
                
            logger.debug(f"Cached result for key: {cache_key[:8]}...")
            
            # 캐시 크기 관리
            self._manage_cache_size()
            
        except Exception as e:
            logger.error(f"Error writing to cache: {str(e)}")
    
    def _clean_expired_cache(self) -> None:
        """만료된 캐시 항목 삭제"""
        try:
            for filename in os.listdir(self.cache_dir):
                if not filename.endswith('.pkl'):
                    continue
                    
                filepath = os.path.join(self.cache_dir, filename)
                
                try:
                    with open(filepath, 'rb') as f:
                        cache_data = pickle.load(f)
                    
                    if time.time() - cache_data.get('timestamp', 0) > self.expiry:
                        os.remove(filepath)
                        logger.debug(f"Removed expired cache: {filename}")
                except Exception:
                    # 손상된 캐시 파일 삭제
                    os.remove(filepath)
        except Exception as e:
            logger.error(f"Error cleaning cache: {str(e)}")
    
    def _manage_cache_size(self) -> None:
        """캐시 크기 관리"""
        try:
            cache_files = []
            
            for filename in os.listdir(self.cache_dir):
                if not filename.endswith('.pkl'):
                    continue
                    
                filepath = os.path.join(self.cache_dir, filename)
                mtime = os.path.getmtime(filepath)
                cache_files.append((filepath, mtime))
            
            # 캐시 파일이 최대 크기를 초과하면 가장 오래된 파일 삭제
            if len(cache_files) > self.max_size:
                cache_files.sort(key=lambda x: x[1])  # 수정 시간 기준 정렬
                
                # 가장 오래된 것부터 삭제
                for filepath, _ in cache_files[:len(cache_files) - self.max_size]:
                    os.remove(filepath)
                    logger.debug(f"Removed old cache: {os.path.basename(filepath)}")
                    
        except Exception as e:
            logger.error(f"Error managing cache size: {str(e)}")
            
    def clear(self) -> None:
        """캐시 전체 삭제"""
        try:
            for filename in os.listdir(self.cache_dir):
                if filename.endswith('.pkl'):
                    os.remove(os.path.join(self.cache_dir, filename))
            logger.info("Cache cleared")
        except Exception as e:
            logger.error(f"Error clearing cache: {str(e)}")
            

# 싱글톤 인스턴스 생성
image_cache = ImageCache()

# 메모리 내 LRU 캐시 데코레이터
def memoize_image_processing(func: Callable):
    """
    이미지 처리 함수를 위한 메모이제이션 데코레이터
    
    Args:
        func: 캐싱할 함수
        
    Returns:
        캐싱된 함수
    """
    # LRU 캐시 적용
    @lru_cache(maxsize=100)
    def compute_hash(image_data_prefix, options_tuple):
        # 이 함수는 해시 계산 결과를 캐싱
        return hashlib.md5((image_data_prefix + str(options_tuple)).encode('utf-8')).hexdigest()
    
    def wrapper(image_data, options=None):
        if options is None:
            options = {}
            
        # 이미지 데이터 처리
        if ',' in image_data:
            prefix, image_data_main = image_data.split(',', 1)
        else:
            prefix = "data:image/jpeg;base64,"
            image_data_main = image_data
            
        # 캐싱을 위한 해시 키 생성
        image_prefix = image_data_main[:100]  # 이미지의 일부만 사용하여 성능 향상
        options_tuple = tuple(sorted(options.items()))
        
        # 해시 계산 (이미 계산된 값은 LRU 캐시에서 가져옴)
        cache_key = compute_hash(image_prefix, options_tuple)
        
        # 파일 캐시 확인
        cached_result = image_cache.get(image_data, options)
        if cached_result:
            return cached_result
            
        # 캐시 미스, 원본 함수 실행
        result = func(image_data, options)
        
        # 결과 캐싱
        image_cache.set(image_data, options, result)
        
        return result
        
    return wrapper 