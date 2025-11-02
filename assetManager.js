class AssetManager {
    constructor() {
        this.assets = new Map();
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        this.initialized = true;
    const input = document.getElementById('assetInput');
    const assetList = document.getElementById('assetList');

    input.addEventListener('change', (e) => {
        Array.from(e.target.files).forEach(file => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                const assetId = `asset_${Date.now()}_${Math.random()}`;
                const assetType = file.type.startsWith('image/') ? 'image' : 
                                 file.type.startsWith('audio/') ? 'audio' : 'file';
                
                // Remove file extension from name
                const cleanName = file.name.replace(/\.[^/.]+$/, "");
                
                const asset = assetManager.storeAsset(file, event.target.result);
                addAssetToUI(asset.id, asset.name, event.target.result, asset.type);
            };
            
            reader.readAsDataURL(file);
        });
        
        input.value = '';
    });

    function addAssetToUI(id, name, data, type) {
        const item = document.createElement('div');
        item.className = 'asset-item';
        item.dataset.assetId = id;
        
        const thumbnail = document.createElement('img');
        thumbnail.className = 'asset-thumbnail';
        if (type === 'image') {
            thumbnail.src = data;
        } else if (type === 'audio') {
            thumbnail.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTggMTZIMlYxOEg4VjE2WiIgZmlsbD0iIzk5OSIvPgo8cGF0aCBkPSJNMjQgMTZWMThIMjZWMTZIMjRaIiBmaWxsPSIjOTk5Ii8+CjxwYXRoIGQ9Ik0xNiA4VjI0TDIwIDIwVjEyTDE2IDhaIiBmaWxsPSIjOTk5Ii8+CjxwYXRoIGQ9Ik0xNiA0VjI4TDEyIDI0VjhMMTYgNFoiIGZpbGw9IiM5OTkiLz4KPC9zdmc+';
        } else {
            thumbnail.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTggOEgxNlYxNkg4VjhaIiBmaWxsPSIjOTk5Ii8+CjxwYXRoIGQ9Ik0yMCA4SDI0VjE2SDIwVjhaIiBmaWxsPSIjOTk5Ii8+CjxwYXRoIGQ9Ik04IDIwSDE2VjI0SDhWMjBaIiBmaWxsPSIjOTk5Ii8+CjxwYXRoIGQ9Ik0yMCAyMEgyNFYyNEgyMFYyMFoiIGZpbGw9IiM5OTkiLz4KPC9zdmc+';
        }
        
        const nameInput = document.createElement('input');
        nameInput.className = 'asset-name';
        nameInput.type = 'text';
        nameInput.value = name;
        nameInput.addEventListener('blur', () => {
            const asset = assets.get(id);
            if (asset) {
                asset.name = nameInput.value;
            }
        });
        nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                nameInput.blur();
            }
        });
        
        const typeBadge = document.createElement('span');
        typeBadge.className = 'asset-type';
        typeBadge.textContent = `.${type}`;
        
        // Add remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'asset-remove';
        removeBtn.innerHTML = '×';
        removeBtn.title = 'Remove asset';
        removeBtn.addEventListener('click', () => {
            assets.delete(id);
            item.remove();
        });
        
        item.appendChild(thumbnail);
        item.appendChild(nameInput);
        item.appendChild(typeBadge);
        item.appendChild(removeBtn);
        assetList.appendChild(item);
    }

    }

    getAsset(id) {
        return this.assets.get(id);
    }

    getAllAssets() {
        return this.assets;
    }

    storeAsset(file, data) {
        const assetId = `asset_${Date.now()}_${Math.random()}`;
        const assetType = file.type.startsWith('image/') ? 'image' : 
                         file.type.startsWith('audio/') ? 'audio' : 'file';
        
        // Remove file extension from name
        const cleanName = file.name.replace(/\.[^/.]+$/, "");
        
        this.assets.set(assetId, {
            name: cleanName,
            type: file.type,
            data: data,
            assetType: assetType
        });

        return { id: assetId, name: cleanName, type: assetType };
    }
}

// Create a singleton instance
export const assetManager = new AssetManager();

// For backwards compatibility
export function initAssetManager() {
    assetManager.init();
    assetManager.init();
}

