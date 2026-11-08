/*!
 * Lupa Zoom v1.2.0
 * Efecto lupa tipo WooCommerce para cualquier imagen, sin dependencias.
 *
 * La clase (.lupa por defecto) puede ir en la propia <img> o en cualquier
 * contenedor: widget de Elementor, columna de WPBakery, figure, enlace…
 * También funciona sobre elementos cuya imagen es un background-image CSS.
 */
( function () {
	'use strict';

	var CFG = window.LupaZoomConfig || {};

	var opts = {
		selector:   CFG.selector   || '.lupa',
		mode:       CFG.mode       || 'inner',
		zoom:       parseFloat( CFG.zoom ) || 0,
		minZoom:    parseFloat( CFG.minZoom ) || 1.5,
		maxZoom:    parseFloat( CFG.maxZoom ) || 6,
		lensSize:   parseInt( CFG.lensSize, 10 ) || 180,
		panelWidth: parseInt( CFG.panelWidth, 10 ) || 400,
		fade:       CFG.fade == null ? 150 : parseInt( CFG.fade, 10 ),
		touch:      !! CFG.touch
	};

	var IMAGE_RE = /\.(jpe?g|png|gif|webp|avif|bmp)(\?|#|$)/i;
	var PLACEHOLDER_RE = /^data:image\/(svg\+xml|gif)/i;

	/* Atributos donde los plugins de lazy-load y los builders esconden la URL
	 * real mientras el src lleva un placeholder. */
	var LAZY_ATTRS = [
		'data-lupa-src',
		'data-large_image',   // WooCommerce
		'data-full-url',
		'data-src',
		'data-lazy-src',
		'data-orig-src',
		'data-original'
	];

	var instances = [];

	function clamp( v, min, max ) {
		return v < min ? min : ( v > max ? max : v );
	}

	function isCoarsePointer() {
		return window.matchMedia && window.matchMedia( '(hover: none)' ).matches;
	}

	function firstUrl( value ) {
		if ( ! value || 'none' === value ) {
			return '';
		}
		var m = /url\(\s*(['"]?)(.*?)\1\s*\)/.exec( value );
		return m ? m[ 2 ] : '';
	}

	/* ------------------------------------------------------------------
	 * Resolución de la imagen en alta resolución
	 * ---------------------------------------------------------------- */

	function largestFromSrcset( srcset ) {
		var best = null;
		var bestW = 0;
		srcset.split( ',' ).forEach( function ( part ) {
			var bits = part.trim().split( /\s+/ );
			if ( ! bits[ 0 ] ) {
				return;
			}
			var w = 0;
			if ( bits[ 1 ] ) {
				if ( /w$/.test( bits[ 1 ] ) ) {
					w = parseInt( bits[ 1 ], 10 );
				} else if ( /x$/.test( bits[ 1 ] ) ) {
					w = parseFloat( bits[ 1 ] ) * 1000; // solo para ordenar
				}
			}
			if ( w >= bestW ) {
				bestW = w;
				best = bits[ 0 ];
			}
		} );
		return best;
	}

	function resolveLargeSrc( img ) {
		var i, val;

		for ( i = 0; i < LAZY_ATTRS.length; i++ ) {
			val = img.getAttribute( LAZY_ATTRS[ i ] );
			if ( val && ! PLACEHOLDER_RE.test( val ) ) {
				return val;
			}
		}

		var link = img.closest ? img.closest( 'a' ) : null;
		if ( link && link.href && IMAGE_RE.test( link.href ) ) {
			return link.href;
		}

		// El <picture> del tema puede tener un srcset mejor que el del <img>.
		var picture = img.closest ? img.closest( 'picture' ) : null;
		var sets = [ img.getAttribute( 'srcset' ) ];
		if ( picture ) {
			Array.prototype.forEach.call( picture.querySelectorAll( 'source' ), function ( s ) {
				sets.push( s.getAttribute( 'srcset' ) );
			} );
		}
		for ( i = 0; i < sets.length; i++ ) {
			if ( sets[ i ] ) {
				var candidate = largestFromSrcset( sets[ i ] );
				if ( candidate && ! PLACEHOLDER_RE.test( candidate ) ) {
					return candidate;
				}
			}
		}

		return img.currentSrc || img.src;
	}

	/* ------------------------------------------------------------------
	 * Geometría: object-fit / background-size / posiciones
	 * ---------------------------------------------------------------- */

	function keywordToFraction( token, axis ) {
		if ( 'center' === token ) {
			return 0.5;
		}
		if ( 'left' === token || 'top' === token ) {
			return 0;
		}
		if ( 'right' === token || 'bottom' === token ) {
			return 1;
		}
		if ( /%$/.test( token ) ) {
			return parseFloat( token ) / 100;
		}
		return 'x' === axis ? 0.5 : 0.5;
	}

	function parsePosition( value, fallback ) {
		if ( ! value ) {
			return { px: fallback, py: fallback };
		}
		var bits = value.trim().split( /\s+/ );
		return {
			px: keywordToFraction( bits[ 0 ], 'x' ),
			py: keywordToFraction( bits[ 1 ] != null ? bits[ 1 ] : bits[ 0 ], 'y' )
		};
	}

	/**
	 * Escala con la que el navegador está pintando la imagen dentro de la caja.
	 * Devuelve escala por eje: `fill` puede deformar, el resto es uniforme.
	 */
	function computeFit( kind, cw, ch, iw, ih ) {
		var s;
		switch ( kind ) {
			case 'contain':
				s = Math.min( cw / iw, ch / ih );
				return { sx: s, sy: s };
			case 'cover':
				s = Math.max( cw / iw, ch / ih );
				return { sx: s, sy: s };
			case 'none':
				return { sx: 1, sy: 1 };
			case 'scale-down':
				s = Math.min( 1, Math.min( cw / iw, ch / ih ) );
				return { sx: s, sy: s };
			default: // fill
				return { sx: cw / iw, sy: ch / ih };
		}
	}

	/** Traduce el background-size calculado a la misma nomenclatura. */
	function fitFromBackgroundSize( value, cw, ch, iw, ih ) {
		if ( 'cover' === value ) {
			return computeFit( 'cover', cw, ch, iw, ih );
		}
		if ( 'contain' === value ) {
			return computeFit( 'contain', cw, ch, iw, ih );
		}

		var bits = ( value || '' ).trim().split( /\s+/ );
		if ( ! bits[ 0 ] || 'auto' === bits[ 0 ] ) {
			return computeFit( 'none', cw, ch, iw, ih );
		}

		function axis( token, box, natural ) {
			if ( ! token || 'auto' === token ) {
				return null;
			}
			if ( /%$/.test( token ) ) {
				return ( parseFloat( token ) / 100 ) * box / natural;
			}
			return parseFloat( token ) / natural;
		}

		var sx = axis( bits[ 0 ], cw, iw );
		var sy = axis( bits[ 1 ], ch, ih );
		if ( null === sx && null === sy ) {
			return computeFit( 'none', cw, ch, iw, ih );
		}
		if ( null === sx ) {
			sx = sy;
		}
		if ( null === sy ) {
			sy = sx;
		}
		return { sx: sx, sy: sy };
	}

	/* ------------------------------------------------------------------
	 * Instancia
	 * ---------------------------------------------------------------- */

	/**
	 * @param {Element}      target Elemento marcado (o el <img>).
	 * @param {HTMLImageElement|null} img Imagen a ampliar; null en modo fondo CSS.
	 */
	function Lupa( target, img ) {
		this.target = target;
		this.img = img;
		this.isBackground = ! img;
		this.mode = target.getAttribute( 'data-lupa-mode' ) ||
			( img && img.getAttribute( 'data-lupa-mode' ) ) ||
			opts.mode;
		this.ready = false;
		this.active = false;
		this.frame = null;
		this.pointer = { x: 0.5, y: 0.5 };

		this.build();
		this.loadLarge();
	}

	/**
	 * Reutiliza un contenedor existente si envuelve únicamente a la imagen.
	 * Evita inyectar nodos dentro del markup de Elementor / WPBakery, que
	 * suele apoyarse en selectores de hijo directo y en wrappers con
	 * aspect-ratio.
	 */
	Lupa.prototype.pickContainer = function () {
		var img = this.img;

		if ( this.isBackground ) {
			return { el: this.target, owned: false };
		}

		var candidates = [];
		var node = img.parentNode;
		// Se sube como mucho hasta el elemento marcado.
		while ( node && 1 === node.nodeType ) {
			candidates.push( node );
			if ( node === this.target ) {
				break;
			}
			node = node.parentNode;
		}

		for ( var i = 0; i < candidates.length; i++ ) {
			var el = candidates[ i ];
			if ( 'PICTURE' === el.tagName || el.classList.contains( 'lupa-zoom-container' ) ) {
				continue;
			}
			if ( /^(BODY|HTML)$/.test( el.tagName ) ) {
				break;
			}
			// Debe envolver solo a la imagen: sin hermanos visibles ni texto.
			if ( 1 !== el.children.length || '' !== el.textContent.trim() ) {
				break;
			}
			// Se queda con el más externo que siga cumpliendo la condición.
			var best = el;
			var j = i + 1;
			while ( j < candidates.length ) {
				var up = candidates[ j ];
				if ( 1 !== up.children.length || '' !== up.textContent.trim() ||
					/^(BODY|HTML)$/.test( up.tagName ) || 'PICTURE' === up.tagName ) {
					break;
				}
				best = up;
				j++;
			}
			return { el: best, owned: false };
		}

		return null;
	};

	Lupa.prototype.build = function () {
		var picked = this.pickContainer();
		var container;

		if ( picked ) {
			container = picked.el;
			this.owned = false;
			this.savedStyle = container.getAttribute( 'style' );

			var cs = window.getComputedStyle( container );
			if ( 'static' === cs.position ) {
				container.style.position = 'relative';
			}
			if ( 'inline' === cs.display ) {
				container.style.display = 'inline-block';
			}
			if ( this.isBackground ) {
				// Crea contexto de apilamiento para poder meter la capa
				// ampliada por debajo del contenido (textos, botones…).
				if ( 'auto' === cs.zIndex ) {
					container.style.zIndex = '0';
				}
			}
		} else {
			container = document.createElement( 'span' );
			this.owned = true;

			var img = this.img;
			var parent = img.parentNode;
			var fluid = false;
			if ( parent && parent.clientWidth ) {
				fluid = img.offsetWidth >= parent.clientWidth - 1;
			}
			if ( /%$/.test( img.style.width || '' ) ) {
				fluid = true;
			}
			if ( fluid ) {
				container.className = 'is-fluid';
			}
			parent.insertBefore( container, img );
			container.appendChild( img );
		}

		container.classList.add( 'lupa-zoom-container', 'lupa-mode-' + this.mode );
		if ( this.owned ) {
			container.classList.add( 'is-wrapper' );
		}
		if ( this.isBackground ) {
			container.classList.add( 'lupa-is-background' );
		}

		var layer = document.createElement( 'span' );
		layer.className = 'lupa-zoom-layer';
		layer.setAttribute( 'aria-hidden', 'true' );
		if ( opts.fade ) {
			layer.style.transitionDuration = opts.fade + 'ms';
		}
		container.appendChild( layer );

		this.container = container;
		this.layer = layer;

		if ( 'lens' === this.mode ) {
			var lens = document.createElement( 'span' );
			lens.className = 'lupa-zoom-lens';
			lens.setAttribute( 'aria-hidden', 'true' );
			if ( opts.fade ) {
				lens.style.transitionDuration = opts.fade + 'ms';
			}
			container.appendChild( lens );
			this.lens = lens;
			this.lensSize = parseInt( this.target.getAttribute( 'data-lupa-lens' ), 10 ) ||
				( this.img && parseInt( this.img.getAttribute( 'data-lupa-lens' ), 10 ) ) ||
				opts.lensSize;
		}
	};

	Lupa.prototype.sourceUrl = function () {
		if ( this.isBackground ) {
			var attr = this.target.getAttribute( 'data-lupa-src' );
			if ( attr ) {
				return attr;
			}
			return firstUrl( window.getComputedStyle( this.target ).backgroundImage );
		}
		return resolveLargeSrc( this.img );
	};

	Lupa.prototype.loadLarge = function () {
		var self = this;
		var url = this.sourceUrl();

		if ( ! url ) {
			this.container.classList.add( 'lupa-error' );
			return;
		}

		var probe = new Image();
		probe.onload = function () {
			self.largeSrc = url;
			self.natW = probe.naturalWidth;
			self.natH = probe.naturalHeight;
			self.layer.style.backgroundImage = 'url("' + url.replace( /"/g, '\\"' ) + '")';
			self.ready = true;
			self.container.classList.add( 'is-ready' );
			self.measure();
			self.bind();
		};
		probe.onerror = function () {
			self.container.classList.add( 'lupa-error' );
		};
		probe.src = url;
	};

	/** Escala y desplazamiento con que se está pintando la imagen visible. */
	Lupa.prototype.currentFit = function ( cw, ch ) {
		if ( this.isBackground ) {
			var bs = window.getComputedStyle( this.target );
			var fit = fitFromBackgroundSize( bs.backgroundSize, cw, ch, this.natW, this.natH );
			var bp = parsePosition( bs.backgroundPosition, 0 );
			return { sx: fit.sx, sy: fit.sy, px: bp.px, py: bp.py };
		}

		var cs = window.getComputedStyle( this.img );
		var f = computeFit( cs.objectFit || 'fill', cw, ch, this.natW, this.natH );
		var op = parsePosition( cs.objectPosition, 0.5 );
		return { sx: f.sx, sy: f.sy, px: op.px, py: op.py };
	};

	/**
	 * Caja real de la imagen dentro del contenedor. No coinciden cuando la
	 * clase va en un wrapper de builder con padding, márgenes o la imagen
	 * centrada. Coordenadas relativas a la caja de padding del contenedor,
	 * que es el origen de la capa posicionada en absoluto.
	 */
	Lupa.prototype.imageBox = function ( containerRect ) {
		if ( this.isBackground ) {
			return {
				left: 0,
				top: 0,
				w: this.container.clientWidth,
				h: this.container.clientHeight,
				vx: containerRect.left,
				vy: containerRect.top
			};
		}

		var cs = window.getComputedStyle( this.container );
		var bl = parseFloat( cs.borderLeftWidth ) || 0;
		var bt = parseFloat( cs.borderTopWidth ) || 0;
		var ir = this.img.getBoundingClientRect();

		return {
			left: ir.left - containerRect.left - bl,
			top: ir.top - containerRect.top - bt,
			w: ir.width,
			h: ir.height,
			vx: ir.left,
			vy: ir.top
		};
	};

	Lupa.prototype.measure = function () {
		if ( ! this.ready ) {
			return;
		}
		var rect = this.container.getBoundingClientRect();
		if ( ! rect.width || ! rect.height ) {
			return;
		}

		var box = this.imageBox( rect );
		if ( ! box.w || ! box.h ) {
			return;
		}

		this.rect = rect;
		this.box = box;
		// El puntero se mide contra la imagen, no contra el wrapper.
		this.trackRect = { left: box.vx, top: box.vy, width: box.w, height: box.h };
		this.cw = box.w;
		this.ch = box.h;

		var fit = this.currentFit( this.cw, this.ch );
		this.sx = fit.sx;
		this.sy = fit.sy;

		// Tamaño y origen de la imagen tal y como se ve ahora mismo.
		this.dw = this.natW * this.sx;
		this.dh = this.natH * this.sy;
		this.ox = ( this.cw - this.dw ) * fit.px;
		this.oy = ( this.ch - this.dh ) * fit.py;
		this.fitPx = fit.px;
		this.fitPy = fit.py;

		var factor = parseFloat( this.target.getAttribute( 'data-lupa-zoom' ) ) ||
			( this.img && parseFloat( this.img.getAttribute( 'data-lupa-zoom' ) ) ) ||
			opts.zoom;
		if ( ! factor ) {
			// Automático: usa toda la resolución real del archivo.
			factor = this.natW / this.dw;
		}
		this.factor = clamp( factor, opts.minZoom, opts.maxZoom );

		if ( 'lens' === this.mode ) {
			this.panelW = Math.min( opts.panelWidth, Math.max( 200, window.innerWidth - this.cw - 40 ) );
			this.panelH = this.ch;
			this.lensW = Math.min( this.lensSize, this.cw );
			this.lensH = this.lensW * ( this.panelH / this.panelW );
			if ( this.lensH > this.ch ) {
				this.lensH = this.ch;
				this.lensW = this.lensH * ( this.panelW / this.panelH );
			}
			this.ratio = this.panelW / this.lensW;

			this.lens.style.width = this.lensW + 'px';
			this.lens.style.height = this.lensH + 'px';
			this.lens.style.left = box.left + 'px';
			this.lens.style.top = box.top + 'px';

			this.layer.style.top = box.top + 'px';
			this.layer.style.width = this.panelW + 'px';
			this.layer.style.height = this.panelH + 'px';
			this.layer.style.backgroundSize = ( this.dw * this.ratio ) + 'px ' + ( this.dh * this.ratio ) + 'px';

			var fitsRight = ( rect.right + this.panelW + 20 ) <= window.innerWidth;
			this.container.classList.toggle( 'lupa-panel-left', ! fitsRight );
		} else {
			this.zw = this.dw * this.factor;
			this.zh = this.dh * this.factor;
			// La capa se recorta exactamente sobre la imagen.
			this.layer.style.left = box.left + 'px';
			this.layer.style.top = box.top + 'px';
			this.layer.style.width = box.w + 'px';
			this.layer.style.height = box.h + 'px';
			this.layer.style.backgroundSize = this.zw + 'px ' + this.zh + 'px';
		}

		if ( this.active ) {
			this.render();
		}
	};

	Lupa.prototype.bind = function () {
		var self = this;
		var c = this.container;

		this.onEnter = function ( e ) {
			self.measure();
			self.activate();
			self.track( e );
		};
		this.onMove = function ( e ) {
			self.track( e );
		};
		this.onLeave = function () {
			self.deactivate();
		};

		c.addEventListener( 'mouseenter', this.onEnter );
		c.addEventListener( 'mousemove', this.onMove );
		c.addEventListener( 'mouseleave', this.onLeave );

		if ( opts.touch ) {
			this.onTouchStart = function ( e ) {
				self.measure();
				self.activate();
				self.track( e.touches[ 0 ] );
			};
			this.onTouchMove = function ( e ) {
				if ( self.active ) {
					e.preventDefault(); // el dedo panea, no hace scroll
					self.track( e.touches[ 0 ] );
				}
			};
			c.addEventListener( 'touchstart', this.onTouchStart, { passive: true } );
			c.addEventListener( 'touchmove', this.onTouchMove, { passive: false } );
			c.addEventListener( 'touchend', this.onLeave );
			c.addEventListener( 'touchcancel', this.onLeave );
		}

		// El puntero se mide en coordenadas de viewport: hay que refrescar la
		// referencia si la página hace scroll con el zoom activo.
		this.onScroll = function () {
			if ( ! self.active ) {
				return;
			}
			var r = ( self.isBackground ? self.container : self.img ).getBoundingClientRect();
			self.trackRect = { left: r.left, top: r.top, width: r.width, height: r.height };
		};
		window.addEventListener( 'scroll', this.onScroll, { passive: true } );

		if ( window.ResizeObserver ) {
			this.ro = new ResizeObserver( function () {
				self.measure();
			} );
			this.ro.observe( c );
			if ( this.img ) {
				this.ro.observe( this.img );
			}
		}
	};

	Lupa.prototype.activate = function () {
		this.active = true;
		this.container.classList.add( 'is-active' );
	};

	Lupa.prototype.deactivate = function () {
		this.active = false;
		this.container.classList.remove( 'is-active' );
	};

	Lupa.prototype.track = function ( point ) {
		if ( ! point || ! this.ready ) {
			return;
		}
		var rect = this.trackRect;
		if ( ! rect ) {
			return;
		}
		this.pointer.x = clamp( ( point.clientX - rect.left ) / rect.width, 0, 1 );
		this.pointer.y = clamp( ( point.clientY - rect.top ) / rect.height, 0, 1 );

		var self = this;
		if ( this.frame ) {
			return;
		}
		this.frame = window.requestAnimationFrame( function () {
			self.frame = null;
			self.render();
		} );
	};

	Lupa.prototype.render = function () {
		if ( ! this.ready || ! this.cw ) {
			return;
		}
		var x = this.pointer.x;
		var y = this.pointer.y;

		if ( 'lens' === this.mode ) {
			var left = clamp( x * this.cw - this.lensW / 2, 0, this.cw - this.lensW );
			var top = clamp( y * this.ch - this.lensH / 2, 0, this.ch - this.lensH );

			this.lens.style.transform = 'translate3d(' + left + 'px,' + top + 'px,0)';
			this.layer.style.backgroundPosition =
				( ( this.ox - left ) * this.ratio ).toFixed( 2 ) + 'px ' +
				( ( this.oy - top ) * this.ratio ).toFixed( 2 ) + 'px';
			return;
		}

		// El punto de la imagen que hay bajo el cursor debe seguir estando
		// bajo el cursor tras ampliar: ox2 = x·cw·(1−f) + ox·f.
		var ox2 = x * this.cw * ( 1 - this.factor ) + this.ox * this.factor;
		var oy2 = y * this.ch * ( 1 - this.factor ) + this.oy * this.factor;

		// Sin huecos: si la imagen ampliada cubre la caja, se limita el paneo.
		ox2 = this.zw >= this.cw
			? clamp( ox2, this.cw - this.zw, 0 )
			: ( this.cw - this.zw ) * this.fitPx;
		oy2 = this.zh >= this.ch
			? clamp( oy2, this.ch - this.zh, 0 )
			: ( this.ch - this.zh ) * this.fitPy;

		this.layer.style.backgroundPosition = ox2.toFixed( 2 ) + 'px ' + oy2.toFixed( 2 ) + 'px';
	};

	Lupa.prototype.destroy = function () {
		if ( this.ro ) {
			this.ro.disconnect();
		}
		var c = this.container;
		c.removeEventListener( 'mouseenter', this.onEnter );
		c.removeEventListener( 'mousemove', this.onMove );
		c.removeEventListener( 'mouseleave', this.onLeave );
		if ( this.onScroll ) {
			window.removeEventListener( 'scroll', this.onScroll );
		}
		if ( this.onTouchStart ) {
			c.removeEventListener( 'touchstart', this.onTouchStart );
			c.removeEventListener( 'touchmove', this.onTouchMove );
			c.removeEventListener( 'touchend', this.onLeave );
			c.removeEventListener( 'touchcancel', this.onLeave );
		}

		if ( this.layer.parentNode ) {
			this.layer.parentNode.removeChild( this.layer );
		}
		if ( this.lens && this.lens.parentNode ) {
			this.lens.parentNode.removeChild( this.lens );
		}

		if ( this.owned ) {
			if ( c.parentNode ) {
				c.parentNode.insertBefore( this.img, c );
				c.parentNode.removeChild( c );
			}
		} else {
			c.classList.remove( 'lupa-zoom-container', 'lupa-mode-inner', 'lupa-mode-lens',
				'lupa-is-background', 'is-ready', 'is-active', 'lupa-panel-left', 'is-wrapper' );
			if ( null === this.savedStyle ) {
				c.removeAttribute( 'style' );
			} else {
				c.setAttribute( 'style', this.savedStyle );
			}
		}

		( this.img || this.target ).removeAttribute( 'data-lupa-ready' );
	};

	/* ------------------------------------------------------------------
	 * Detección y arranque
	 * ---------------------------------------------------------------- */

	/** Espera a que el elemento tenga tamaño real (slider oculto, pestaña…). */
	function whenSized( el, cb ) {
		if ( el.offsetWidth && el.offsetHeight ) {
			cb();
			return;
		}
		if ( ! window.ResizeObserver ) {
			window.setTimeout( function () {
				whenSized( el, cb );
			}, 300 );
			return;
		}
		var ro = new ResizeObserver( function () {
			if ( el.offsetWidth && el.offsetHeight ) {
				ro.disconnect();
				cb();
			}
		} );
		ro.observe( el );
	}

	/** Espera a que el lazy-load sustituya el placeholder por la imagen real. */
	function whenLoaded( img, cb ) {
		// Se mira el atributo, no currentSrc: este último sigue apuntando al
		// placeholder hasta que la imagen nueva termina de descargarse.
		var current = function () {
			return img.getAttribute( 'src' ) || img.currentSrc || img.src;
		};
		var src = current();
		var isPlaceholder = ! src || PLACEHOLDER_RE.test( src );

		if ( ! isPlaceholder && img.complete && img.naturalWidth ) {
			cb();
			return;
		}
		if ( ! isPlaceholder ) {
			img.addEventListener( 'load', cb, { once: true } );
			return;
		}
		if ( ! window.MutationObserver ) {
			img.addEventListener( 'load', cb, { once: true } );
			return;
		}
		var mo = new MutationObserver( function () {
			var now = current();
			if ( now && ! PLACEHOLDER_RE.test( now ) ) {
				mo.disconnect();
				if ( img.complete && img.naturalWidth ) {
					cb();
				} else {
					img.addEventListener( 'load', cb, { once: true } );
				}
			}
		} );
		mo.observe( img, { attributes: true, attributeFilter: [ 'src', 'srcset' ] } );
	}

	function setupImage( target, img ) {
		if ( img.getAttribute( 'data-lupa-ready' ) ) {
			return;
		}
		img.setAttribute( 'data-lupa-ready', '1' );

		whenLoaded( img, function () {
			whenSized( img, function () {
				instances.push( new Lupa( target, img ) );
			} );
		} );
	}

	function setupBackground( el ) {
		if ( el.getAttribute( 'data-lupa-ready' ) ) {
			return;
		}
		el.setAttribute( 'data-lupa-ready', '1' );

		whenSized( el, function () {
			instances.push( new Lupa( el, null ) );
		} );
	}

	function setupTarget( el ) {
		if ( 'IMG' === el.tagName ) {
			setupImage( el, el );
			return;
		}

		var imgs = el.querySelectorAll( 'img' );
		if ( imgs.length ) {
			// Widget de builder: la clase va en el wrapper, la imagen dentro.
			Array.prototype.forEach.call( imgs, function ( img ) {
				setupImage( el, img );
			} );
			return;
		}

		// Sin <img>: puede ser un elemento con background-image (Elementor,
		// WPBakery, cabeceras de tema…).
		if ( firstUrl( window.getComputedStyle( el ).backgroundImage ) ) {
			setupBackground( el );
		}
	}

	function scan( root ) {
		var scope = root || document;
		var found;
		try {
			found = scope.querySelectorAll( opts.selector );
		} catch ( err ) {
			return; // Selector inválido en los ajustes: no romper la página.
		}
		Array.prototype.forEach.call( found, setupTarget );
	}

	function init() {
		if ( isCoarsePointer() && ! opts.touch ) {
			return;
		}

		scan( document );

		// Contenido cargado por AJAX, sliders, editor de Elementor, filtros…
		if ( window.MutationObserver ) {
			var pending = false;
			var observer = new MutationObserver( function ( records ) {
				// Ignora las mutaciones que provoca el propio plugin.
				var relevant = records.some( function ( r ) {
					var t = r.target;
					return ! ( t && t.closest && t.closest( '.lupa-zoom-container' ) );
				} );
				if ( ! relevant || pending ) {
					return;
				}
				pending = true;
				window.requestAnimationFrame( function () {
					pending = false;
					scan( document );
				} );
			} );
			observer.observe( document.body, { childList: true, subtree: true } );
		}

		document.addEventListener( 'lupa:refresh', function () {
			scan( document );
		} );
	}

	window.LupaZoom = {
		refresh: function ( root ) {
			scan( root );
		},
		destroyAll: function () {
			instances.splice( 0 ).forEach( function ( i ) {
				i.destroy();
			} );
		},
		instances: instances
	};

	if ( 'loading' === document.readyState ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}
} )();
