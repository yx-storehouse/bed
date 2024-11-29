const repoOwner = 'yxnbkls';
const repoName = 'storge';
const accessToken = '9f43664de2ca43df41b8c78b1ea88019';
const filePath = 'images.json';

// 存储的 SHA 值和数据
let lastSha = '';
let images = [];

// UTF-8 转 Base64
function utf8_to_b64(str) {
    return window.btoa(unescape(encodeURIComponent(str)));
}

// Base64 转 UTF-8
function b64_to_utf8(str) {
    return decodeURIComponent(escape(window.atob(str)));
}

// 显示加载动画
function showLoading() {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = 'block';
    }
}

// 隐藏加载动画
function hideLoading() {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
}

// 显示 Toast 提示
function showToast(message) {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.querySelector('p').textContent = message; // 设置提示信息
        toast.classList.add('show'); // 添加显示类
        setTimeout(() => {
            toast.classList.remove('show');
        }, 2000); // 2秒后自动隐藏 Toast
    } else {
        console.error("Toast element not found!");
    }
}

// 获取文件内容
async function getFileContent() {
    showLoading(); // 显示加载动画
    try {
        const url = `https://gitee.com/api/v5/repos/${repoOwner}/${repoName}/contents/${filePath}`;
        const response = await fetch(url, {
            headers: {
                Authorization: `token ${accessToken}`,
            },
        });

        if (response.ok) {
            const data = await response.json();
            lastSha = data.sha;
            const content = b64_to_utf8(data.content); // 解码文件内容
            try {
                images = JSON.parse(content);
            } catch (e) {
                images = []; // 如果解析失败，初始化为空数组
            }
            renderImages();
        } else {
            console.error('无法获取文件内容');
        }
    } catch (error) {
        console.error('获取文件内容时出错:', error);
    } finally {
        hideLoading(); // 隐藏加载动画
        showToast("加载成功");
    }
}

// 更新文件内容
async function updateFileContent(newImages) {
    showLoading(); // 显示加载动画
    try {
        const url = `https://gitee.com/api/v5/repos/${repoOwner}/${repoName}/contents/${filePath}`;
        const content = utf8_to_b64(JSON.stringify(newImages));
        const data = {
            message: '更新图片数据',
            content: content,
            sha: lastSha,
        };

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                Authorization: `token ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (response.ok) {
            const result = await response.json();
            lastSha = result.content.sha;
            showToast('更新成功'); // 上传成功 Toast 提示
        } else {
            showToast('更新失败');
            console.error('更新失败');
        }
    } catch (error) {
        showToast('更新失败');
        console.error('更新文件内容时出错:', error);
    } finally {
        hideLoading(); // 隐藏加载动画
    }
}

// 渲染图片
function renderImages() {
    const grid = document.getElementById('imageGrid');
    grid.innerHTML = images.map(image => `
        <div class="bg-white rounded-lg shadow overflow-hidden relative">
        <div class="image-container" onclick="handleImageClick(event, '${image.url}')">
            <img src="${image.url}" alt="${image.title}" class="preview-image">
            <div class="action-icons">
                <button onclick="copyImageUrl('${image.url}')" title="复制链接">
                    <i class="fas fa-copy"></i>
                </button>
                <button onclick="downloadImage('${image.url}', '${image.title}')" title="下载图片">
                    <i class="fas fa-download"></i>
                </button>
                <button onclick="deleteImage(${image.id})" title="删除图片">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        <div class="p-3">
            <div class="title-container text-sm text-gray-700">${image.title}</div>
        </div>
        </div>
    `).join('');
}


// 图片点击事件
function handleImageClick(event, url) {
    if (!event.target.closest('.action-icons')) {
        showPreview(url);
    }
}

// 预览图片
function showPreview(url) {
    const modal = document.getElementById('previewModal');
    const previewImage = document.getElementById('previewImage');
    previewImage.style.opacity = '0';
    modal.classList.add('active');
    previewImage.onload = () => {
        previewImage.style.opacity = '1';
    };
    previewImage.onerror = () => {
        showToast('图片加载失败');
        modal.classList.remove('active');
    };
    previewImage.src = url;
}

// 关闭预览
function hidePreviewModal() {
    const modal = document.getElementById('previewModal');
    modal.classList.remove('active');
}

// 显示添加图片的模态框
function showAddModal() {
    document.getElementById('addModal').classList.add('active');
}

// 隐藏添加图片的模态框
function hideAddModal() {
    document.getElementById('addModal').classList.remove('active');
    document.getElementById('addForm').reset();
}

// 添加图片
async function handleAddImage(event) {
    event.preventDefault();
    const title = document.getElementById('titleInput').value;
    const url = document.getElementById('urlInput').value;
    const submitButton = document.getElementById('submitButton');
    submitButton.disabled = true; // 禁用上传按钮
    showLoading(); // 显示加载动画

    try {
        const newImage = { id: Date.now(), title, url };
        images.unshift(newImage);
        await updateFileContent(images);
        renderImages();
        hideAddModal();
        showToast('图片上传成功');
    } catch (error) {
        console.error('Error adding image:', error);
        showToast('图片上传失败');
    } finally {
        hideLoading(); // 隐藏加载动画
        submitButton.disabled = false; // 重新启用上传按钮
    }
}

// 验证图片链接
function validateImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
    });
}

// 复制图片链接
function copyImageUrl(url) {
    navigator.clipboard.writeText(url).then(() => showToast('链接已复制')).catch(() => showToast('复制失败'));
}
// 下载
function downloadImage(url, title) {
    fetch(url, { mode: 'cors' }) // 尝试获取图片数据
        .then(response => {
            if (!response.ok) {
                throw new Error('图片无法下载');
            }
            return response.blob(); // 获取图片的 Blob 数据
        })
        .then(blob => {
            const objectUrl = URL.createObjectURL(blob); // 创建一个临时的 Blob URL
            const anchor = document.createElement('a');
            anchor.href = objectUrl;
            anchor.download = title || 'download'; // 指定下载的文件名
            document.body.appendChild(anchor); // 添加到 DOM
            anchor.click(); // 触发下载
            document.body.removeChild(anchor); // 从 DOM 中移除
            URL.revokeObjectURL(objectUrl); // 释放 Blob URL
            showToast('图片下载成功');
        })
        .catch(() => {
            showToast('图片无法下载');
        });
}



// 删除图片
let deleteImageId = null; // 用于存储待删除图片的 ID

// 显示删除确认模态框
function showDeleteConfirmModal(id) {
    deleteImageId = id; // 记录要删除的图片 ID
    const modal = document.getElementById('deleteConfirmModal');
    modal.style.display = 'block';
}

// 隐藏删除确认模态框
function hideDeleteConfirmModal() {
    deleteImageId = null; // 重置 ID
    const modal = document.getElementById('deleteConfirmModal');
    modal.style.display = 'none';
}

// 确认删除图片
async function confirmDeleteImage() {
    if (deleteImageId !== null) {
        images = images.filter(img => img.id !== deleteImageId); // 删除图片
        await updateFileContent(images); // 更新数据库
        renderImages(); // 重新渲染
        showToast('图片已删除'); // 显示删除成功的 Toast 提示
        hideDeleteConfirmModal(); // 关闭模态框
    }
}

// 取消删除
function cancelDeleteImage() {
    hideDeleteConfirmModal(); // 隐藏模态框
}

// 删除按钮点击事件
function deleteImage(id) {
    showDeleteConfirmModal(id); // 打开确认模态框
}




// 页面加载时获取 Gitee 文件内容
document.addEventListener('DOMContentLoaded', () => {
    getFileContent();
        // 确认删除按钮
        const confirmDeleteButton = document.getElementById('confirmDeleteButton');
        confirmDeleteButton.addEventListener('click', confirmDeleteImage);
    
        // 取消删除按钮
        const cancelDeleteButton = document.getElementById('cancelDeleteButton');
        cancelDeleteButton.addEventListener('click', cancelDeleteImage);
});

// 监听 Escape 键关闭模态框
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        hideAddModal();
        hidePreviewModal();
    }
});
