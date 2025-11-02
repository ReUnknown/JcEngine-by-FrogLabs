// Function to create and load a blob from base64 data
function base64ToBlob(base64, type) {
    const byteString = atob(base64.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    
    return new Blob([ab], { type });
}

export function loadDemoAssets(assetManager) {
    // Base64 data for Apple.webp and Ufo.webp would go here
    // We'll use placeholder images for now
    const placeholderApple = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCI+PGNpcmNsZSBjeD0iMzIiIGN5PSIzMiIgcj0iMjQiIGZpbGw9InJlZCIvPjwvc3ZnPg==';
    const placeholderUfo = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCI+PGVsbGlwc2UgY3g9IjMyIiBjeT0iMzIiIHJ4PSIyOCIgcnk9IjE2IiBmaWxsPSJncmF5Ii8+PC9zdmc+';

    // Create files from the base64 data
    const appleFile = new File(
        [base64ToBlob(placeholderApple, 'image/webp')],
        'Apple.webp',
        { type: 'image/webp' }
    );

    const ufoFile = new File(
        [base64ToBlob(placeholderUfo, 'image/webp')],
        'Ufo.webp',
        { type: 'image/webp' }
    );

    // Load the files into the asset manager
    const reader = new FileReader();
    
    reader.onload = (event) => {
        assetManager.storeAsset(appleFile, event.target.result);
        // Add to UI
        window.addAssetToUI(
            `asset_${Date.now()}_apple`,
            'Apple',
            event.target.result,
            'image'
        );
    };
    reader.readAsDataURL(appleFile);

    // Load UFO after apple is done
    reader.onloadend = () => {
        const reader2 = new FileReader();
        reader2.onload = (event) => {
            assetManager.storeAsset(ufoFile, event.target.result);
            // Add to UI
            window.addAssetToUI(
                `asset_${Date.now()}_ufo`,
                'Ufo',
                event.target.result,
                'image'
            );
        };
        reader2.readAsDataURL(ufoFile);
    };
}