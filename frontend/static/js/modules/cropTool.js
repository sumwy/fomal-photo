// 자르기 도구 기능 모듈화
export class CropTool {
  constructor(overlayElement, boxElement, containerElement) {
    this.isCropping = false;
    this.overlay = overlayElement;
    this.box = boxElement;
    this.container = containerElement;
    this.#initEventListeners();
  }

  #initEventListeners() {
    this.overlay.addEventListener('mousedown', this.#handleMouseDown.bind(this));
    document.addEventListener('mousemove', this.#handleMouseMove.bind(this));
    document.addEventListener('mouseup', this.#handleMouseUp.bind(this));
  }

  #handleMouseDown(e) {
    if (e.target === this.box) {
      this.#startDrag(e);
    } else if (e.target.classList.contains('crop-handle')) {
      this.#startResize(e);
    }
  }

  #startDrag(e) {
    this.isDragging = true;
    [this.startX, this.startY] = [e.clientX, e.clientY];
    [this.boxX, this.boxY] = [this.box.offsetLeft, this.box.offsetTop];
  }

  #startResize(e) {
    this.isResizing = true;
    this.handle = e.target;
    [this.startX, this.startY] = [e.clientX, e.clientY];
    [this.boxX, this.boxY, this.boxWidth, this.boxHeight] = [
      this.box.offsetLeft, 
      this.box.offsetTop,
      this.box.offsetWidth,
      this.box.offsetHeight
    ];
  }

  #handleMouseMove(e) {
    if (this.isDragging) this.#dragBox(e);
    if (this.isResizing) this.#resizeBox(e);
  }

  #dragBox(e) {
    const offsetX = e.clientX - this.startX;
    const offsetY = e.clientY - this.startY;
    const [newX, newY] = this.#constrainPosition(
      this.boxX + offsetX, 
      this.boxY + offsetY
    );
    
    this.box.style.left = `${newX}px`;
    this.box.style.top = `${newY}px`;
  }

  #resizeBox(e) {
    const offsetX = e.clientX - this.startX;
    const offsetY = e.clientY - this.startY;
    const { newX, newY, newWidth, newHeight } = this.#calculateNewSize(offsetX, offsetY);
    
    this.box.style.left = `${newX}px`;
    this.box.style.top = `${newY}px`;
    this.box.style.width = `${newWidth}px`;
    this.box.style.height = `${newHeight}px`;
  }

  #calculateNewSize(offsetX, offsetY) {
    // ... 기존 리사이즈 계산 로직 구현
  }

  #constrainPosition(x, y) {
    const containerRect = this.container.getBoundingClientRect();
    const boxRect = this.box.getBoundingClientRect();
    return [
      Math.max(0, Math.min(x, containerRect.width - boxRect.width)),
      Math.max(0, Math.min(y, containerRect.height - boxRect.height))
    ];
  }

  #handleMouseUp() {
    this.isDragging = false;
    this.isResizing = false;
    this.handle = null;
  }

  toggle() {
    this.isCropping = !this.isCropping;
    this.overlay.style.display = this.isCropping ? 'block' : 'none';
    this.container.classList.toggle('cropping', this.isCropping);
  }
} 