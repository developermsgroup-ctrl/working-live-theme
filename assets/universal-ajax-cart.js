/**
 * Universal AJAX Add to Cart Handler
 * Intercepts ALL add to cart forms and handles them via AJAX
 * Prevents page reload and opens cart drawer
 */

(function () {
  'use strict';

  class UniversalCartHandler {
    constructor() {
      this.init();
    }

    init() {
      // Listen for all form submissions with action containing /cart/add
      document.addEventListener('submit', (e) => {
        const form = e.target;

        // Check if this is an add to cart form
        if (form && form.action && form.action.includes('/cart/add')) {
          e.preventDefault();
          e.stopPropagation();
          this.handleFormSubmit(form);
        }
      });

      // Also handle quick-add custom element clicks
      document.addEventListener('click', (e) => {
        const quickAddElement = e.target.closest('product-quick-add[data-form="false"]');
        if (quickAddElement) {
          e.preventDefault();
          e.stopPropagation();
          this.handleQuickAdd(quickAddElement);
        }
      });
    }

    async handleQuickAdd(element) {
      const variantId = element.getAttribute('data-id');
      const button = element.querySelector('button');

      if (!variantId || !button) return;

      // Set loading state
      element.setAttribute('aria-busy', 'true');
      button.disabled = true;

      try {
        await this.addToCart(variantId, 1);

        // Success
        setTimeout(() => {
          element.setAttribute('aria-busy', 'false');
          button.disabled = false;
        }, 1000);

      } catch (error) {
        console.error('Quick add error:', error);
        element.setAttribute('aria-busy', 'false');
        button.disabled = false;
      }
    }

    async handleFormSubmit(form) {
      const formData = new FormData(form);
      const variantId = formData.get('id');
      const quantity = formData.get('quantity') || 1;

      if (!variantId) {
        console.error('No variant ID in form');
        return;
      }

      try {
        await this.addToCart(variantId, quantity);
      } catch (error) {
        console.error('Form submit error:', error);
      }
    }

    async addToCart(variantId, quantity) {
      try {
        // Add item to cart
        const response = await fetch('/cart/add.js', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: JSON.stringify({
            id: variantId,
            quantity: parseInt(quantity)
          })
        });

        if (!response.ok) {
          throw new Error('Failed to add to cart');
        }

        await response.json();

        // Get updated cart count
        const cartResponse = await fetch('/cart.js');
        const cart = await cartResponse.json();

        // Update cart count in header
        this.updateCartCount(cart.item_count);

        // Refresh and open cart drawer
        await this.refreshAndOpenCartDrawer();

      } catch (error) {
        console.error('Add to cart error:', error);
        throw error;
      }
    }

    updateCartCount(count) {
      // Update cart count badges
      const cartElements = document.querySelectorAll('[data-cart-count]');
      cartElements.forEach(element => {
        element.setAttribute('data-cart-count', count);
      });

      // Update header cart badge
      const headerCart = document.querySelector('.header--cart');
      if (headerCart) {
        let badge = headerCart.querySelector('.cart-count-badge');

        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'cart-count-badge';
          badge.style.cssText = `
            position: absolute !important;
            top: -8px !important;
            right: -8px !important;
            background-color: #d32f2f !important;
            color: white !important;
            border-radius: 50% !important;
            min-width: 18px !important;
            height: 18px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-size: 11px !important;
            font-weight: bold !important;
            z-index: 100 !important;
          `;
          headerCart.appendChild(badge);
        }

        if (count > 0) {
          badge.textContent = count;
          badge.style.display = 'flex';
        } else {
          badge.style.display = 'none';
        }
      }
    }

    async refreshAndOpenCartDrawer() {
      try {
        // Fetch updated cart drawer
        const response = await fetch(window.location.origin + '/?sections=cart-drawer');
        const data = await response.json();
        const cartDrawerHTML = data['cart-drawer'];

        if (cartDrawerHTML) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(cartDrawerHTML, 'text/html');
          const newCartElement = doc.querySelector('cart-element');
          const currentCartElement = document.querySelector('[data-drawer-view="cart-drawer"] cart-element');

          if (newCartElement && currentCartElement) {
            // Update cart content
            currentCartElement.innerHTML = newCartElement.innerHTML;

            // Copy attributes
            Array.from(newCartElement.attributes).forEach(attr => {
              currentCartElement.setAttribute(attr.name, attr.value);
            });
          }
        }

        // Open cart drawer
        this.openCartDrawer();

      } catch (error) {
        console.error('Error refreshing cart:', error);
      }
    }

    openCartDrawer() {
      // Method 1: Find drawer and open it
      const drawerView = document.querySelector('[data-drawer-view="cart-drawer"]');
      if (drawerView) {
        const drawer = drawerView.closest('[data-drawer]');
        if (drawer) {
          drawer.setAttribute('data-drawer-open', 'true');
          document.body.style.overflow = 'hidden';
          return;
        }
      }

      // Method 2: Trigger cart link click
      const cartTrigger = document.querySelector('[data-cart-drawer-trigger]');
      if (cartTrigger) {
        cartTrigger.click();
        return;
      }

      // Method 3: Header cart link
      const headerCartLink = document.querySelector('.header--cart a');
      if (headerCartLink) {
        headerCartLink.click();
      }
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new UniversalCartHandler();
    });
  } else {
    new UniversalCartHandler();
  }
})();
