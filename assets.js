export async function loadAssets(manager) {
  const list = [
    ['officeBG', 'assets/office.png'],
    ['downtownBG', 'assets/downtown_street.png'],
  ];

  for (const [key, path] of list) {
    const img = new Image();
    await new Promise((resolve) => {
      img.onload = resolve;
      img.src = path;
    });
    manager.assets.set(key, img);
  }
}
