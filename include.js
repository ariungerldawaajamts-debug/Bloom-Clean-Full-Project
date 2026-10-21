(() => {
  const partialPaths = [
    'partials/header.html',
    'partials/home.html',
    'partials/flowers.html',
    'partials/coffee.html',
    'partials/about.html',
    'partials/profile.html',
    'partials/admin.html',
    'partials/auth-modal.html',
    'partials/checkout-modal.html',
    'partials/builder-modal.html',
    'partials/footer.html',
  ];

  async function loadScript(source) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = source;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Скрипт ачаалж чадсангүй: ${source}`));
      document.body.append(script);
    });
  }

  async function initialize() {
    const loadedPartials = await Promise.all(
      partialPaths.map(async (path) => {
        const response = await fetch(path);
        if (!response.ok) {
          throw new Error(`HTML хэсэг ачаалж чадсангүй: ${path} (${response.status})`);
        }
        return [path, await response.text()];
      }),
    );
    const partials = new Map(loadedPartials);

    function createPartial(path) {
      const html = partials.get(path);
      if (html === undefined) throw new Error(`HTML хэсэг олдсонгүй: ${path}`);
      const template = document.createElement('template');
      template.innerHTML = html;
      for (const placeholder of [...template.content.querySelectorAll('[data-include]')]) {
        placeholder.replaceWith(createPartial(placeholder.dataset.include));
      }
      return template.content;
    }

    for (const placeholder of [...document.querySelectorAll('body > [data-include]')]) {
      placeholder.replaceWith(createPartial(placeholder.dataset.include));
    }

    await loadScript('script.js');
    await loadScript('dashboard.js');
    await loadScript('password-recovery.js');
  }

  initialize().catch((error) => {
    console.error('Bloom хуудсыг ачаалахад алдаа гарлаа.', error);
  });
})();
