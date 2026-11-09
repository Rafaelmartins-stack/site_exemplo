/**
 * AURAL LUXURY HARDWARE ATELIER - APPLICATION LOGIC
 * Manages the 3D phone viewer, Quote Calculator, Cart Drawer, and UI interactions.
 */

// Initialize global state
const state = {
  cart: [],
  selectedBrand: 'apple',
  selectedModel: 'iPhone 16 Pro Max',
  selectedIssues: ['screen'],
  activeFilter: 'all'
};

// Device Models Catalog for Quote Calculator
const deviceModels = {
  apple: [
    'iPhone 16 Pro Max',
    'iPhone 16 Pro',
    'iPhone 16 Plus / 16',
    'iPhone 15 Pro Max',
    'iPhone 15 Pro',
    'iPhone 15 / 15 Plus',
    'iPhone 14 Pro Max',
    'iPhone 14 Pro / 14',
    'iPhone 13 Pro Max / 13 Pro'
  ],
  samsung: [
    'Galaxy S24 Ultra',
    'Galaxy S24+ / S24',
    'Galaxy S23 Ultra',
    'Galaxy Z Fold 6 / 5',
    'Galaxy Z Flip 6 / 5',
    'Galaxy S22 Ultra'
  ],
  xiaomi: [
    'Xiaomi 14 Ultra',
    'Xiaomi 14 Pro / 14',
    'Xiaomi 13 Ultra',
    'Xiaomi 13 Pro',
    'Poco F6 Pro / X6 Pro'
  ],
  google: [
    'Pixel 9 Pro XL',
    'Pixel 9 Pro / 9',
    'Pixel 8 Pro',
    'Pixel 8',
    'Pixel 7 Pro'
  ]
};

// Repair Issues with base pricing & times
const repairServices = {
  screen: {
    name: 'Troca de Vidro / Display OLED 120Hz',
    desc: 'Procedimento a laser preservando o display original e True Tone / taxa de 120Hz.',
    price: 580,
    time: '45 minutos',
    warranty: '1 Ano de Garantia'
  },
  battery: {
    name: 'Substituição de Bateria Hyper-Core (Grau A+)',
    desc: 'Célula de alta densidade com 100% de saúde e calibração de ciclo no sistema.',
    price: 320,
    time: '35 minutos',
    warranty: '1 Ano de Garantia'
  },
  board: {
    name: 'Micro-soldagem em Placa Lógica & CPU Bionic',
    desc: 'Recuperação de trilhas e componentes SMD em curto ou aparelhos que não ligam.',
    price: 650,
    time: '2 a 4 horas',
    warranty: '1 Ano de Garantia'
  },
  camera: {
    name: 'Restauração de Câmeras & Estabilização OIS',
    desc: 'Troca de lentes de safira, sensores periscópicos e calibração de foco a laser.',
    price: 440,
    time: '50 minutos',
    warranty: '1 Ano de Garantia'
  },
  backglass: {
    name: 'Troca de Vidro Traseiro a Laser',
    desc: 'Remoção óptica a laser sem necessidade de abrir ou forçar o chassi do aparelho.',
    price: 290,
    time: '40 minutos',
    warranty: '1 Ano de Garantia'
  },
  water: {
    name: 'Desoxidação Ultrassônica & Banho Químico',
    desc: 'Limpeza profunda em câmara de ondas ultrassônicas para aparelhos que caíram na água.',
    price: 260,
    time: '1 a 2 horas',
    warranty: 'Garantia de Laudo'
  },
  dock: {
    name: 'Conector de Carga USB-C / Flex de Áudio',
    desc: 'Substituição de porta Thunderbolt/USB-C com suporte a carga rápida 65W.',
    price: 240,
    time: '30 minutos',
    warranty: '1 Ano de Garantia'
  }
};

// Accessories Catalog
const accessories = [
  {
    id: 'earbuds-pro',
    name: 'Fone Aural Pro X TWS Audiophile',
    category: 'audio',
    categoryLabel: 'Áudio Hi-Res',
    price: 890,
    badge: 'Flagship Edition',
    specs: ['Cancelamento Ativo -45dB', 'Hi-Res Audio 24-bit/192kHz', 'Bateria 38h c/ estojo', 'Drivers de Berílio 11mm'],
    icon: 'headphones',
    imageText: 'PRO X TWS'
  },
  {
    id: 'case-kevlar',
    name: 'Capa Aural Kevlar Aramid 1500D MagSafe',
    category: 'cases',
    categoryLabel: 'Proteção Aeroespacial',
    price: 280,
    badge: 'Fibra Real 1500D',
    specs: ['Fibra Balística Militar', 'Magnets Neodímio N52 Ultra', 'Espessura 0.85mm', 'Textura Aderente Acetinada'],
    icon: 'shield',
    imageText: 'KEVLAR 1500D'
  },
  {
    id: 'charger-gan',
    name: 'Carregador GaN Aural 67W Triplo Ultra-Slim',
    category: 'chargers',
    categoryLabel: 'Energia GaN III',
    price: 240,
    badge: 'Nitreto de Gálio',
    specs: ['2x USB-C 67W + 1x USB-A', 'Protocolo PD 3.0 & QC 4+', 'Proteção Térmica Ativa', 'Design Tamanho de Cartão'],
    icon: 'zap',
    imageText: 'GaN 67W SLIM'
  },
  {
    id: 'cable-kevlar',
    name: 'Cabo Blindado Aural 240W c/ Display OLED',
    category: 'chargers',
    categoryLabel: 'Cabos Blindados',
    price: 140,
    badge: 'Medidor em Watts',
    specs: ['Display Digital em Tempo Real', 'Suporte a 240W (48V/5A)', 'Revestimento Kevlar Trançado', 'Transmissão 40Gbps'],
    icon: 'activity',
    imageText: '240W WATT-METER'
  },
  {
    id: 'glass-sapphire',
    name: 'Kit Película Cristal Safira 9H com Gabarito',
    category: 'protection',
    categoryLabel: 'Vidro Blindado',
    price: 120,
    badge: 'Safira Sintética',
    specs: ['Dureza 9H Escala Mohs', 'Tratamento Oleofóbico Plasma', 'Aplicador a Vácuo Zero Bolhas', 'Borda Curva 2.5D Polida'],
    icon: 'smartphone',
    imageText: 'SAPPHIRE 9H'
  },
  {
    id: 'powerbank-mag',
    name: 'Power Bank Magnético 10.000mAh Alumínio',
    category: 'chargers',
    categoryLabel: 'Baterias Portáteis',
    price: 380,
    badge: 'Qi2 15W + 30W PD',
    specs: ['Alumínio Usinado CNC', 'Display Digital de Carga %', 'Carregamento Duplo Simultâneo', 'Compatível MagSafe Apple & Android'],
    icon: 'battery-charging',
    imageText: 'MAG 10000mAh'
  }
];

// WhatsApp direct business number configuration
const WHATSAPP_PHONE = '5511999999999'; // Replace with real atelier number

// Document Ready
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  // Initialize 3D Smartphone Viewer with retry safeguard
  tryInitViewer();

  // Initialize Quote Calculator
  initQuoteCalculator();

  // Initialize Accessories Store
  initAccessoriesStore();

  // Initialize Cart Drawer & Badges
  initCart();

  // Initialize General UI Listeners (Mobile menu, Smooth scroll buttons)
  initUIListeners();
});

let viewerInstance = null;

function tryInitViewer(attempt = 0) {
  const container = document.getElementById('phone-canvas-container');
  if (!container) return;

  if (typeof THREE !== 'undefined' && typeof THREE.GLTFLoader !== 'undefined' && typeof AuralPhoneViewer !== 'undefined') {
    init3DViewer();
  } else if (attempt < 50) {
    setTimeout(() => tryInitViewer(attempt + 1), 100);
  } else {
    container.innerHTML = `
      <div class="phone-model-status is-error">
        Não foi possível iniciar o visualizador 3D. Recarregue a página e tente novamente.
      </div>
    `;
  }
}

function init3DViewer() {
  const container = document.getElementById('phone-canvas-container');
  if (!container) return;

  if (!viewerInstance) {
    viewerInstance = new AuralPhoneViewer('phone-canvas-container', {
      modelUrl: 'assets/iphone-14-pro.glb'
    });
    window.phoneViewer = viewerInstance;
  }
}

// ==========================================
// QUOTE CALCULATOR MODULE
// ==========================================
function initQuoteCalculator() {
  const brandSelect = document.getElementById('calc-brand-select');
  const modelSelect = document.getElementById('calc-model-select');
  const issuesContainer = document.getElementById('calc-issues-container');
  const priceValueEl = document.getElementById('calc-total-price');
  const timeValueEl = document.getElementById('calc-est-time');
  const issueSummaryEl = document.getElementById('calc-issue-summary');
  const btnWhatsappRepair = document.getElementById('btn-whatsapp-repair');

  if (!brandSelect || !modelSelect || !issuesContainer) return;

  // Render Brands tabs/select
  brandSelect.addEventListener('change', (e) => {
    state.selectedBrand = e.target.value;
    updateModelOptions();
    calculateQuote();
  });

  function updateModelOptions() {
    const models = deviceModels[state.selectedBrand] || [];
    modelSelect.innerHTML = models.map(m => `<option value="${m}">${m}</option>`).join('');
    state.selectedModel = models[0] || '';
  }

  modelSelect.addEventListener('change', (e) => {
    state.selectedModel = e.target.value;
    calculateQuote();
  });

  // Render Issue check items
  issuesContainer.innerHTML = Object.entries(repairServices).map(([key, item]) => {
    const isChecked = state.selectedIssues.includes(key);
    return `
      <label class="calc-issue-item flex items-start gap-3 p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-blue-500/40 cursor-pointer transition-all ${isChecked ? 'border-blue-500/60 bg-blue-600/[0.08]' : ''}" data-key="${key}">
        <input type="checkbox" value="${key}" ${isChecked ? 'checked' : ''} class="mt-1 accent-blue-600 w-4 h-4 rounded cursor-pointer issue-checkbox">
        <div class="flex-1">
          <div class="flex items-center justify-between">
            <span class="text-sm font-display font-medium text-white">${item.name}</span>
            <span class="text-xs font-mono font-semibold text-blue-400">R$ ${item.price.toFixed(2).replace('.', ',')}</span>
          </div>
          <p class="text-xs text-zinc-400 mt-1">${item.desc}</p>
          <div class="flex items-center gap-3 mt-2">
            <span class="text-[11px] font-mono text-zinc-500">⏱ ${item.time}</span>
            <span class="text-[11px] font-mono text-cyan-400">🛡 ${item.warranty}</span>
          </div>
        </div>
      </label>
    `;
  }).join('');

  // Handle issue selection changes
  issuesContainer.addEventListener('change', (e) => {
    if (e.target.classList.contains('issue-checkbox')) {
      const selected = Array.from(issuesContainer.querySelectorAll('.issue-checkbox:checked')).map(cb => cb.value);
      state.selectedIssues = selected;

      // Update styling of labels
      issuesContainer.querySelectorAll('.calc-issue-item').forEach(lbl => {
        const key = lbl.getAttribute('data-key');
        if (state.selectedIssues.includes(key)) {
          lbl.classList.add('border-blue-500/60', 'bg-blue-600/[0.08]');
        } else {
          lbl.classList.remove('border-blue-500/60', 'bg-blue-600/[0.08]');
        }
      });

      calculateQuote();
    }
  });

  function calculateQuote() {
    let totalPrice = 0;
    let maxTime = '35 minutos';
    const names = [];

    // Calculate with brand multiplier for ultra-premium models
    let brandMultiplier = 1.0;
    if (state.selectedModel.includes('Ultra') || state.selectedModel.includes('Pro Max') || state.selectedModel.includes('Fold')) {
      brandMultiplier = 1.15;
    }

    state.selectedIssues.forEach(key => {
      const serv = repairServices[key];
      if (serv) {
        totalPrice += serv.price * brandMultiplier;
        names.push(serv.name);
        maxTime = serv.time; // rough estimate
      }
    });

    if (state.selectedIssues.length > 1) {
      // Combo discount (10% on additional services)
      totalPrice = totalPrice * 0.92;
    }

    if (priceValueEl) {
      priceValueEl.textContent = `R$ ${Math.round(totalPrice).toLocaleString('pt-BR')},00`;
    }

    if (timeValueEl) {
      timeValueEl.textContent = state.selectedIssues.length === 0 ? 'Selecione um serviço' : `Estimativa: ${maxTime}`;
    }

    if (issueSummaryEl) {
      if (names.length === 0) {
        issueSummaryEl.innerHTML = `<span class="text-zinc-500 text-xs">Nenhum serviço selecionado. Selecione acima.</span>`;
      } else {
        issueSummaryEl.innerHTML = names.map(n => `
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.05] border border-white/[0.08] text-xs font-mono text-zinc-300">
            <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            ${n}
          </span>
        `).join('');
      }
    }

    // Update WhatsApp link
    if (btnWhatsappRepair) {
      const issueListStr = names.join(', ');
      const msg = `Olá, equipe AURAL Hardware Lab! Gostaria de agendar um reparo para o meu dispositivo:\n\n📱 *Modelo:* ${state.selectedModel}\n🔧 *Serviços Selecionados:* ${issueListStr}\n💰 *Estimativa do Site:* R$ ${Math.round(totalPrice).toLocaleString('pt-BR')},00\n\nGostaria de verificar a disponibilidade de atendimento no Atelier.`;
      const encoded = encodeURIComponent(msg);
      btnWhatsappRepair.href = `https://wa.me/${WHATSAPP_PHONE}?text=${encoded}`;
    }
  }

  // Initial populate
  updateModelOptions();
  calculateQuote();
}

// ==========================================
// ACCESSORIES STORE MODULE
// ==========================================
function initAccessoriesStore() {
  const grid = document.getElementById('accessories-grid');
  const filterBtns = document.querySelectorAll('[data-filter]');

  if (!grid) return;

  function renderAccessories(category = 'all') {
    const filtered = category === 'all' 
      ? accessories 
      : accessories.filter(a => a.category === category);

    grid.innerHTML = filtered.map(item => `
      <div class="aural-card aural-card-blue p-6 flex flex-col justify-between group">
        <div>
          <!-- Product Visual / Hologram Frame -->
          <div class="relative w-full h-48 rounded-xl bg-gradient-to-b from-blue-600/[0.08] to-transparent border border-white/[0.06] flex items-center justify-center overflow-hidden mb-5 group-hover:border-blue-500/40 transition-all">
            <div class="absolute top-3 left-3">
              <span class="badge-blue text-[10px]">${item.badge}</span>
            </div>
            <div class="absolute top-3 right-3 text-[11px] font-mono text-zinc-500">
              [REF-${item.id.toUpperCase().slice(0, 6)}]
            </div>

            <!-- Stylized Luxury Graphic Placeholder -->
            <div class="w-24 h-24 rounded-2xl bg-zinc-900/90 border border-white/10 flex flex-col items-center justify-center p-3 text-center shadow-2xl group-hover:scale-105 group-hover:border-blue-500/50 transition-transform">
              <i data-lucide="${item.icon}" class="w-8 h-8 text-blue-400 mb-2"></i>
              <span class="text-[9px] font-mono text-zinc-400 tracking-wider uppercase">${item.imageText}</span>
            </div>
          </div>

          <!-- Product Info -->
          <span class="text-xs font-mono text-blue-400/90 uppercase tracking-widest">${item.categoryLabel}</span>
          <h3 class="text-lg font-display font-semibold text-white mt-1 group-hover:text-blue-400 transition-colors">${item.name}</h3>

          <!-- Specs List -->
          <div class="mt-4 space-y-1.5">
            ${item.specs.map(spec => `
              <div class="flex items-center gap-2 text-xs text-zinc-400">
                <span class="w-1.5 h-1.5 rounded-full bg-blue-500/80"></span>
                <span>${spec}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Price & Action -->
        <div class="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between">
          <div>
            <span class="text-[11px] font-mono text-zinc-500 block">VALOR ATELIER</span>
            <span class="text-xl font-display font-bold text-white">R$ ${item.price.toFixed(2).replace('.', ',')}</span>
          </div>
          <button class="btn-primary text-xs py-2.5 px-4 add-to-cart-btn" data-id="${item.id}">
            <i data-lucide="shopping-bag" class="w-4 h-4"></i>
            <span>Adicionar</span>
          </button>
        </div>
      </div>
    `).join('');

    // Re-create icons for newly added items
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }

    // Bind Add to Cart buttons
    grid.querySelectorAll('.add-to-cart-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = btn.getAttribute('data-id');
        addToCart(id);
      });
    });
  }

  // Filter Buttons
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('bg-blue-600/20', 'border-blue-500/50', 'text-blue-400'));
      btn.classList.add('bg-blue-600/20', 'border-blue-500/50', 'text-blue-400');
      const cat = btn.getAttribute('data-filter');
      renderAccessories(cat);
    });
  });

  renderAccessories('all');
}

// ==========================================
// CART & DRAWER MODULE
// ==========================================
function initCart() {
  const cartDrawer = document.getElementById('cart-drawer');
  const cartOverlay = document.getElementById('cart-overlay');
  const cartItemsList = document.getElementById('cart-items-list');
  const cartSubtotalEl = document.getElementById('cart-subtotal');
  const cartCountBadges = document.querySelectorAll('.cart-count-badge');
  const btnOpenCart = document.querySelectorAll('.btn-open-cart');
  const btnCloseCart = document.getElementById('btn-close-cart');
  const btnCheckoutWhatsapp = document.getElementById('btn-checkout-whatsapp');

  btnOpenCart.forEach(btn => {
    btn.addEventListener('click', () => openCart());
  });

  if (btnCloseCart) btnCloseCart.addEventListener('click', () => closeCart());
  if (cartOverlay) cartOverlay.addEventListener('click', () => closeCart());

  window.addToCart = function(productId) {
    const product = accessories.find(a => a.id === productId);
    if (!product) return;

    const existing = state.cart.find(c => c.id === productId);
    if (existing) {
      existing.quantity += 1;
    } else {
      state.cart.push({ ...product, quantity: 1 });
    }

    updateCartUI();
    showToast(`"${product.name}" adicionado à sacola.`);
    openCart();
  };

  window.removeFromCart = function(productId) {
    state.cart = state.cart.filter(c => c.id !== productId);
    updateCartUI();
  };

  window.changeCartQty = function(productId, delta) {
    const item = state.cart.find(c => c.id === productId);
    if (!item) return;

    item.quantity += delta;
    if (item.quantity <= 0) {
      removeFromCart(productId);
    } else {
      updateCartUI();
    }
  };

  function openCart() {
    if (!cartDrawer || !cartOverlay) return;
    cartOverlay.classList.remove('opacity-0', 'pointer-events-none');
    cartOverlay.classList.add('opacity-100', 'pointer-events-auto');
    cartDrawer.classList.remove('translate-x-full');
    cartDrawer.classList.add('translate-x-0');
  }

  function closeCart() {
    if (!cartDrawer || !cartOverlay) return;
    cartOverlay.classList.remove('opacity-100', 'pointer-events-auto');
    cartOverlay.classList.add('opacity-0', 'pointer-events-none');
    cartDrawer.classList.remove('translate-x-0');
    cartDrawer.classList.add('translate-x-full');
  }

  function updateCartUI() {
    const totalCount = state.cart.reduce((acc, cur) => acc + cur.quantity, 0);
    const subtotal = state.cart.reduce((acc, cur) => acc + cur.price * cur.quantity, 0);

    // Update badges
    cartCountBadges.forEach(b => {
      b.textContent = totalCount;
      if (totalCount > 0) {
        b.classList.remove('hidden');
      } else {
        b.classList.add('hidden');
      }
    });

    if (cartSubtotalEl) {
      cartSubtotalEl.textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
    }

    if (!cartItemsList) return;

    if (state.cart.length === 0) {
      cartItemsList.innerHTML = `
        <div class="h-64 flex flex-col items-center justify-center text-center p-6 text-zinc-500">
          <i data-lucide="shopping-bag" class="w-12 h-12 stroke-[1.2] mb-3 text-zinc-600"></i>
          <p class="text-sm font-display font-medium text-zinc-400">Sua sacola está vazia</p>
          <p class="text-xs text-zinc-600 mt-1">Explore nossa curadoria de acessórios de alta performance.</p>
        </div>
      `;
    } else {
      cartItemsList.innerHTML = state.cart.map(item => `
        <div class="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between gap-3">
          <div class="flex-1">
            <span class="text-[10px] font-mono text-blue-400 uppercase tracking-widest">${item.categoryLabel}</span>
            <h4 class="text-xs font-display font-semibold text-white leading-tight mt-0.5">${item.name}</h4>
            <span class="text-xs font-mono text-zinc-300 mt-1 block">R$ ${item.price.toFixed(2).replace('.', ',')}</span>
          </div>

          <div class="flex items-center gap-2">
            <button onclick="changeCartQty('${item.id}', -1)" class="w-6 h-6 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs font-mono">-</button>
            <span class="text-xs font-mono font-bold text-white px-1.5">${item.quantity}</span>
            <button onclick="changeCartQty('${item.id}', 1)" class="w-6 h-6 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs font-mono">+</button>
            <button onclick="removeFromCart('${item.id}')" class="text-zinc-500 hover:text-red-400 ml-2 p-1">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>
      `).join('');
    }

    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }

    // Update WhatsApp Checkout Link
    if (btnCheckoutWhatsapp) {
      if (state.cart.length === 0) {
        btnCheckoutWhatsapp.classList.add('opacity-50', 'pointer-events-none');
      } else {
        btnCheckoutWhatsapp.classList.remove('opacity-50', 'pointer-events-none');
        const itemsList = state.cart.map(c => `• ${c.name} (${c.quantity}x) - R$ ${(c.price * c.quantity).toFixed(2)}`).join('\n');
        const text = `Olá, AURAL Atelier! Gostaria de adquirir os seguintes itens da Boutique:\n\n${itemsList}\n\n*Total:* R$ ${subtotal.toFixed(2)}\n\nPoderiam me enviar os dados para pagamento e retirada/envio express?`;
        btnCheckoutWhatsapp.href = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(text)}`;
      }
    }
  }

  updateCartUI();
}

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================
function showToast(message) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <span class="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
    <span class="text-xs font-medium text-white">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3200);
}

// ==========================================
// GENERAL UI LISTENERS
// ==========================================
function initUIListeners() {
  // Mobile Navigation toggle
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');

  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });

    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
      });
    });
  }

  // FAQ Accordion
  document.querySelectorAll('.faq-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const content = btn.nextElementSibling;
      const icon = btn.querySelector('.faq-icon');
      if (!content) return;

      const isExpanded = !content.classList.contains('hidden');
      if (isExpanded) {
        content.classList.add('hidden');
        if (icon) icon.style.transform = 'rotate(0deg)';
      } else {
        content.classList.remove('hidden');
        if (icon) icon.style.transform = 'rotate(180deg)';
      }
    });
  });
}
