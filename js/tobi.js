/**
 * Tobi
 *
 * @author rqrauhvmra
 * @version 1.4.1
 * @url https://github.com/rqrauhvmra/Tobi
 *
 * MIT License
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(factory)
  } else if (typeof module === 'object' && module.exports) {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory()
  } else {
    // Browser globals (root is window)
    root.Tobi = factory()
  }
}(this, function () {
  'use strict'

  var Tobi = function Tobi (userOptions) {
    /**
     * Merge default options with user options
     *
     * @param {Object} userOptions - User options
     * @returns {Object} - Custom options
     */
    var mergeOptions = function mergeOptions (userOptions) {
      // Default options
      var options = {
        selector: '.lightbox',
        captions: true,
        captionsSelector: 'img',
        captionAttribute: 'alt',
        nav: 'auto',
        navText: ['&lsaquo;', '&rsaquo;'],
        close: true,
        closeText: '&times;',
        counter: true,
        keyboard: true,
        zoom: true,
        zoomText: '&plus;',
        docClose: false,
        swipeClose: true,
        scroll: false,
        draggable: true,
        threshold: 20
      }

      if (userOptions) {
        Object.keys(userOptions).forEach(function (key) {
          options[key] = userOptions[key]
        })
      }

      return options
    }

    /**
     * Global variables
     *
     */
    var config = {},
      transformProperty = null,
      gallery = [],
      x = 0,
      sliderElements = [],
      currentIndex = 0,
      drag = {},
      pointerDown = false,
      lastFocus = null

    /*
     * Create lightbox components
     *
     */
    var overlay = document.createElement('div')
    overlay.setAttribute('role', 'dialog')
    overlay.setAttribute('aria-hidden', 'true')
    overlay.classList.add('tobi-overlay')
    document.getElementsByTagName('body')[0].appendChild(overlay)

    var slider = document.createElement('div')
    slider.classList.add('tobi-slider')
    overlay.appendChild(slider)

    var prevButton = document.createElement('button')
    prevButton.setAttribute('type', 'button')
    prevButton.setAttribute('aria-label', 'Previous')
    overlay.appendChild(prevButton)

    var nextButton = document.createElement('button')
    nextButton.setAttribute('type', 'button')
    nextButton.setAttribute('aria-label', 'Next')
    overlay.appendChild(nextButton)

    var closeButton = document.createElement('button')
    closeButton.setAttribute('type', 'button')
    closeButton.setAttribute('aria-label', 'Close')
    overlay.appendChild(closeButton)

    var counter = document.createElement('div')
    counter.classList.add('tobi-counter')
    overlay.appendChild(counter)

    /**
     * Determine if browser supports unprefixed transform property
     *
     * @returns {string} - Transform property supported by client
     */
    var transformSupport = function transformSupport () {
      var div = document.documentElement.style

      if (typeof div.transform === 'string') {
        return 'transform'
      }
      return 'WebkitTransform'
    }

    /**
     * Load image with particular index
     *
     * @param {number} index - Item index to load
     * @param {function} callback - Optional callback function
     */
    var load = function load (index, callback) {
      if (typeof gallery[index] === 'undefined' || typeof sliderElements[index] === 'undefined') {
        return
      } else if (!sliderElements[index].getElementsByTagName('img')[0].hasAttribute('data-src')) {
        if (callback) {
          callback()
        }
        return
      }

      var figure = sliderElements[index].getElementsByTagName('figure')[0],
        image = figure.getElementsByTagName('img')[0],
        figcaption = figure.getElementsByTagName('figcaption')[0]

      image.onload = function () {
        var loader = figure.querySelector('.tobi-loader')
        figure.removeChild(loader)
        image.style.opacity = '1'

        if (figcaption) {
          figcaption.style.opacity = '1'
        }
      }

      image.setAttribute('src', image.getAttribute('data-src'))
      image.removeAttribute('data-src')

      if (callback) {
        callback()
      }
    }

    /**
     * Update the offset
     *
     */
    var updateOffset = function updateOffset () {
      var offset = -currentIndex * 100 + '%'

      slider.style[transformProperty] = 'translate3d(' + offset + ', 0, 0)'
    }

    /**
     * Update the counter
     *
     */
    var updateCounter = function updateCounter () {
      counter.innerHTML = (currentIndex + 1) + '/' + gallery.length
    }

    /**
     * Set the focus to the next element
     *
     */
    var updateFocus = function updateFocus (direction) {
      if (config.nav) {
        prevButton.disabled = false
        nextButton.disabled = false

        if (currentIndex === gallery.length - 1) {
          nextButton.disabled = true
        } else if (currentIndex === 0) {
          prevButton.disabled = true
        }

        if (direction === 'none' && !nextButton.disabled) {
          nextButton.focus()
        } else if (direction === 'none' && nextButton.disabled && !prevButton.disabled) {
          prevButton.focus()
        } else if (!nextButton.disabled && direction === 'right') {
          nextButton.focus()
        } else if (nextButton.disabled && direction === 'right' && !prevButton.disabled) {
          prevButton.focus()
        } else if (!prevButton.disabled && direction === 'left') {
          prevButton.focus()
        } else if (prevButton.disabled && direction === 'left' && !nextButton.disabled) {
          nextButton.focus()
        }
      } else if (config.close) {
        closeButton.focus()
      }
    }

    /**
     * Preload image with particular index
     *
     * @param {number} index - Item index to preload
     */
    var preload = function preload (index) {
      load(index)
    }

    /**
     * Go to next image
     *
     */
    var next = function next () {
      if (currentIndex < gallery.length - 1) {
        currentIndex++

        updateOffset()
        updateCounter()
        updateFocus('right')

        preload(currentIndex + 1)
      }
    }

    /**
     * Go to previous image
     *
     */
    var prev = function prev () {
      if (currentIndex > 0) {
        currentIndex--

        updateOffset()
        updateCounter()
        updateFocus('left')

        preload(currentIndex - 1)
      }
    }

    /**
     * Create overlay
     *
     */
    var createOverlay = function createOverlay (element) {
      var figureWrapper = null,
        figure = null,
        image = null,
        figuresIds = [],
        figcaption = null,
        figcaptionsIds = []

      var sliderElement = document.createElement('div')
      sliderElement.classList.add('tobi-slide')
      sliderElement.id = 'tobi-slide-' + gallery.length

      // Create figure wrapper
      figureWrapper = document.createElement('div')
      figureWrapper.classList.add('tobi-figure-wrapper')
      figureWrapper.id = 'tobi-figure-wrapper-' + gallery.length

      // Create figure
      figure = document.createElement('figure')
      figure.innerHTML = '<div class="tobi-loader"></div>'

      // Create image
      image = document.createElement('img')
      image.style.opacity = '0'

      if (element.getElementsByTagName('img')[0] && element.getElementsByTagName('img')[0].alt) {
        image.alt = element.getElementsByTagName('img')[0].alt
      } else {
        image.alt = ''
      }

      image.setAttribute('src', '')
      image.setAttribute('data-src', element.href)

      // Add image to figure
      figure.appendChild(image)

      // Create figcaption
      if (config.captions) {
        figcaption = document.createElement('figcaption')
        figcaption.style.opacity = '0'

        if (config.captionsSelector === 'self' && element.getAttribute(config.captionAttribute)) {
          figcaption.innerHTML = element.getAttribute(config.captionAttribute)
        } else if (config.captionsSelector === 'img' && element.getElementsByTagName('img')[0].getAttribute(config.captionAttribute)) {
          figcaption.innerHTML = element.getElementsByTagName('img')[0].getAttribute(config.captionAttribute)
        }

        if (figcaption.innerHTML) {
          figure.id = 'tobi-figure-' + x
          figcaption.id = 'tobi-figcaption-' + x
          figure.appendChild(figcaption)

          figuresIds.push('tobi-figure-' + x)
          figcaptionsIds.push('tobi-figcaption-' + x)
          ++x
        }
      }

      // Add figure to figure wrapper
      figureWrapper.appendChild(figure)

      // Add figure wrapper to slider element
      sliderElement.appendChild(figureWrapper)

      // Add slider element to slider
      slider.appendChild(sliderElement)
      sliderElements.push(sliderElement)

      if (x !== 0) {
        overlay.setAttribute('aria-labelledby', figuresIds.join(' '))
        overlay.setAttribute('aria-describedby', figcaptionsIds.join(' '))
      }

      // Hide buttons if necessary
      if (!config.nav || gallery.length === 1 || (config.nav === 'auto' && 'ontouchstart' in window)) {
        prevButton.style.display = 'none'
        nextButton.style.display = 'none'
      } else {
        prevButton.style.display = 'initial'
        nextButton.style.display = 'initial'
        prevButton.innerHTML = config.navText[0]
        nextButton.innerHTML = config.navText[1]
      }

      // Hide counter if necessary
      if (!config.counter || gallery.length === 1) {
        counter.style.display = 'none'
      }

      // Hide close if necessary
      if (!config.close) {
        closeButton.style.display = 'none'
      } else {
        closeButton.innerHTML = config.closeText
      }

      if (config.draggable) {
        slider.style.cursor = '-webkit-grab'
      }
    }

    /**
     * Open overlay
     *
     * @param {number} index - Item index to load
     */
    var openOverlay = function openOverlay (index) {
      if (overlay.getAttribute('aria-hidden') === 'false') {
        return
      }

      if (!config.scroll) {
        document.documentElement.classList.add('tobi--is-open')
        document.body.classList.add('tobi--is-open')
      }

      // Save last focused element
      lastFocus = document.activeElement

      // Set current index
      currentIndex = index

      // Clear drag
      clearDrag()

      // Bind events
      bindEvents()

      // Load image
      load(currentIndex, function () {
        preload(currentIndex + 1)
        preload(currentIndex - 1)
      })

      updateOffset()
      updateCounter()
      overlay.setAttribute('aria-hidden', 'false')

      updateFocus('none')
    }

    /**
     * Close overlay
     *
     */
    var closeOverlay = function closeOverlay () {
      if (overlay.getAttribute('aria-hidden') === 'true') {
        return
      }

      if (!config.scroll) {
        document.documentElement.classList.remove('tobi--is-open')
        document.body.classList.remove('tobi--is-open')
      }

      // Unbind events
      unbindEvents()

      overlay.setAttribute('aria-hidden', 'true')

      // Focus
      lastFocus.focus()
    }

    /**
     * Clear drag after touchend
     *
     */
    var clearDrag = function clearDrag () {
      drag = {
        startX: 0,
        endX: 0,
        startY: 0,
        endY: 0
      }
    }

    /**
     * Recalculate drag event
     *
     */
    var updateAfterDrag = function updateAfterDrag () {
      var movementX = drag.endX - drag.startX,
        movementY = drag.endY - drag.startY,
        movementXDistance = Math.abs(movementX),
        movementYDistance = Math.abs(movementY)

      if (movementX > 0 && movementXDistance > config.threshold) {
        prev()
      } else if (movementX < 0 && movementXDistance > config.threshold) {
        next()
      } else if (movementY < 0 && movementYDistance > config.threshold && config.swipeClose) {
        closeOverlay()
      }
    }

    /**
     * click event handler
     *
     */
    var clickHandler = function clickHandler (event) {
      if (this === prevButton) {
        prev()
      } else if (this === nextButton) {
        next()
      } else if (this === closeButton || (this === overlay && event.target.id.indexOf('tobi-figure-wrapper') !== -1)) {
        closeOverlay()
      }

      event.preventDefault()
    }

    /**
     * keydown event handler
     *
     */
    var keydownHandler = function keydownHandler (event) {
      switch (event.keyCode) {
        // Left arrow
        case 37:
          prev()
          break

        // Right arrow
        case 39:
          next()
          break

        // Esc
        case 27:
          closeOverlay()
          break
      }
    }

    /**
     * touchstart event handler
     *
     */
    var touchstartHandler = function touchstartHandler (event) {
      event.stopPropagation()

      pointerDown = true

      drag.startX = event.touches[0].pageX
      drag.startY = event.touches[0].pageY
    }

    /**
     * touchmove event handler
     *
     */
    var touchmoveHandler = function touchmoveHandler (event) {
      event.preventDefault()
      event.stopPropagation()

      if (pointerDown) {
        drag.endX = event.touches[0].pageX
        drag.endY = event.touches[0].pageY
      }
    }

    /**
     * touchend event handler
     *
     */
    var touchendHandler = function touchendHandler (event) {
      event.stopPropagation()

      pointerDown = false

      if (drag.endX) {
        updateAfterDrag()
      }

      clearDrag()
    }

    /**
     * mousedown event handler
     *
     */
    var mousedownHandler = function mousedownHandler (event) {
      event.preventDefault()
      event.stopPropagation()

      pointerDown = true
      drag.startX = event.pageX
    }

    /**
     * mouseup event handler
     *
     */
    var mouseupHandler = function mouseupHandler (event) {
      event.stopPropagation()

      pointerDown = false
      slider.style.cursor = '-webkit-grab'

      if (drag.endX) {
        updateAfterDrag()
      }

      clearDrag()
    }

    /**
     * mousemove event handler
     *
     */
    var mousemoveHandler = function mousemoveHandler (event) {
      event.preventDefault()

      if (pointerDown) {
        drag.endX = event.pageX
        slider.style.cursor = '-webkit-grabbing'
      }
    }

    /**
     * mouseleave event handler
     *
     */
    var mouseleaveHandler = function mouseleaveHandler (event) {
      if (pointerDown) {
        pointerDown = false
        slider.style.cursor = '-webkit-grab'
        drag.endX = event.pageX

        updateAfterDrag()
        clearDrag()
      }
    }

    /**
     * Keep focus inside the lightbox
     *
     */
    var trapFocus = function trapFocus (event) {
      if (overlay.getAttribute('aria-hidden') === 'false' && !overlay.contains(event.target)) {
        event.stopPropagation()
        updateFocus('none')
      }
    }

    /**
     * Bind events
     *
     */
    var bindEvents = function bindEvents () {
      if (config.keyboard) {
        document.addEventListener('keydown', keydownHandler)
      }

      if (config.docClose) {
        overlay.addEventListener('click', clickHandler)
      }

      prevButton.addEventListener('click', clickHandler)
      nextButton.addEventListener('click', clickHandler)
      closeButton.addEventListener('click', clickHandler)

      if (config.draggable) {
        // Touch events
        overlay.addEventListener('touchstart', touchstartHandler)
        overlay.addEventListener('touchmove', touchmoveHandler)
        overlay.addEventListener('touchend', touchendHandler)

        // Mouse events
        overlay.addEventListener('mousedown', mousedownHandler)
        overlay.addEventListener('mouseup', mouseupHandler)
        overlay.addEventListener('mouseleave', mouseleaveHandler)
        overlay.addEventListener('mousemove', mousemoveHandler)
      }

      document.addEventListener('focus', trapFocus, true)
    }

    /**
     * Unbind events
     *
     */
    var unbindEvents = function unbindEvents () {
      if (config.keyboard) {
        document.removeEventListener('keydown', keydownHandler)
      }

      if (config.docClose) {
        overlay.removeEventListener('click', clickHandler)
      }

      prevButton.removeEventListener('click', clickHandler)
      nextButton.removeEventListener('click', clickHandler)
      closeButton.removeEventListener('click', clickHandler)

      if (config.draggable) {
        // Touch events
        overlay.removeEventListener('touchstart', touchstartHandler)
        overlay.removeEventListener('touchmove', touchmoveHandler)
        overlay.removeEventListener('touchend', touchendHandler)

        // Mouse events
        overlay.removeEventListener('mousedown', mousedownHandler)
        overlay.removeEventListener('mouseup', mouseupHandler)
        overlay.removeEventListener('mouseleave', mouseleaveHandler)
        overlay.removeEventListener('mousemove', mousemoveHandler)
      }

      document.removeEventListener('focus', trapFocus)
    }

    var initElement = function initElement (element) {
      if (gallery.indexOf(element) === -1) {
        gallery.push(element)
        element.classList.add('tobi')

        // Set zoom icon if necessary
        if (config.zoom && element.getElementsByTagName('img')[0]) {
          var tobiZoom = document.createElement('div')

          tobiZoom.classList.add('tobi__zoom-icon')
          tobiZoom.innerHTML = config.zoomText

          element.classList.add('tobi--zoom')
          element.appendChild(tobiZoom)
        }

        // Bind click event handler
        element.addEventListener('click', function (event) {
          event.preventDefault()

          openOverlay(gallery.indexOf(this))
        })

        // Add element to gallery
        createOverlay(element)
      }
    }

    /**
     * Init
     *
     */
    var init = function init (userOptions) {
      // Merge user options into defaults
      config = mergeOptions(userOptions)

      // Transform property supported by client
      transformProperty = transformSupport()

      // Get a list of all elements within the document
      var elements = document.querySelectorAll(config.selector)

      if (!elements.length) {
        console.log('Ups, I can\'t find the selector ' + config.selector + '.')
        return
      }

      // Execute a few things once per element
      [].forEach.call(elements, function (element) {
        initElement(element)
      })
    }

    // Make private function available from outside
    this.add = function (element) {
      initElement(element)
    }

    init(userOptions)
  }

  return Tobi
}))
