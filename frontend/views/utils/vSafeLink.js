/*
 * Copyright (c) 2026 quantbitrealmSimon
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/*
 * v-safe-link directive
 *
 * A Vue directive to safely render external links with proper security attributes
 * to prevent reverse tabnabbing and other link-based attacks.
 *
 * Usage:
 *   <a v-safe-link="'https://example.com'">Link</a>
 *   <a v-safe-link="{ url: 'https://example.com', allowed: true }">Link</a>
 *
 * Automatically adds:
 *   - target="_blank"
 *   - rel="noopener noreferrer"
 *   - href validation against allowed URLs
 *
 * See: https://github.com/okTurtles/group-income/issues/975
 */

import Vue from 'vue'
import allowedUrlsByKey from './allowedUrls.js'
import { has } from 'turtledash'

// List of allowed URL patterns (protocols)
const ALLOWED_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:']

// Check if a URL is in the allowed list
const isAllowedUrl = (url: string): boolean => {
  // Check against allowed URLs list
  const allowedValues = Object.values(allowedUrlsByKey)
  if (allowedValues.includes(url)) {
    return true
  }
  
  // Check if URL starts with any allowed URL
  for (const allowedUrl of allowedValues) {
    if (url.startsWith(allowedUrl)) {
      return true
    }
  }
  
  return false
}

// Validate URL protocol
const hasAllowedProtocol = (url: string): boolean => {
  try {
    const parsed = new URL(url, window.location.origin)
    return ALLOWED_PROTOCOLS.includes(parsed.protocol)
  } catch (e) {
    // Relative URLs are allowed
    return !url.includes(':') || url.startsWith('/')
  }
}

// Sanitize and validate URL
const sanitizeUrl = (url: string): string | null => {
  if (!url) return null
  
  // Trim whitespace
  url = url.trim()
  
  // Check for javascript: protocol (XSS prevention)
  const lowerUrl = url.toLowerCase()
  if (lowerUrl.startsWith('javascript:') || 
      lowerUrl.startsWith('data:') || 
      lowerUrl.startsWith('vbscript:')) {
    console.warn('[v-safe-link] Blocked potentially dangerous URL:', url)
    return null
  }
  
  // Validate protocol
  if (!hasAllowedProtocol(url)) {
    console.warn('[v-safe-link] Blocked URL with disallowed protocol:', url)
    return null
  }
  
  return url
}

const transform = (el: HTMLAnchorElement, binding) => {
  if (binding.oldValue !== binding.value) {
    let url: string | null = null
    let useAllowedCheck: boolean = false
    
    // Handle different binding value types
    if (typeof binding.value === 'string') {
      url = binding.value
    } else if (typeof binding.value === 'object' && binding.value !== null) {
      url = binding.value.url || binding.value.href
      useAllowedCheck = binding.value.allowed || false
    }
    
    // Sanitize URL
    url = sanitizeUrl(url)
    
    if (!url) {
      // Remove href if URL is invalid
      el.removeAttribute('href')
      el.classList.add('disabled-link')
      return
    }
    
    // Check against allowed URLs if required
    if (useAllowedCheck && !isAllowedUrl(url)) {
      console.warn('[v-safe-link] URL not in allowed list:', url)
      el.removeAttribute('href')
      el.classList.add('disabled-link')
      return
    }
    
    // Set the href
    el.setAttribute('href', url)
    
    // Add security attributes for external links
    const isExternal = url.startsWith('http') && !url.startsWith(window.location.origin)
    
    if (isExternal) {
      el.setAttribute('target', '_blank')
      el.setAttribute('rel', 'noopener noreferrer')
    }
    
    // Remove any potentially dangerous attributes
    el.removeAttribute('onclick')
  }
}

/*
 * Register a global custom directive called `v-safe-link`.
 *
 * Use this for all external/user-provided links to prevent:
 *   - Reverse tabnabbing attacks
 *   - XSS via javascript: URLs
 *   - Protocol-based attacks
 *
 * See: https://github.com/okTurtles/group-income/issues/975
 */

Vue.directive('safe-link', {
  bind: transform,
  update: transform
})
