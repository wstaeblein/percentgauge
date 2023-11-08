
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    /**
     * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
     * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
     * it can be called from an external module).
     *
     * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
     *
     * https://svelte.dev/docs#run-time-svelte-onmount
     */
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function bind(component, name, callback, value) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            if (value === undefined) {
                callback(component.$$.ctx[index]);
            }
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.55.0' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\percentgauge.svelte generated by Svelte v3.55.0 */

    const { console: console_1 } = globals;
    const file$1 = "src\\percentgauge.svelte";

    // (74:8) {#if configs.legend}
    function create_if_block(ctx) {
    	let span;
    	let t_value = /*configs*/ ctx[4].legend + "";
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(t_value);
    			attr_dev(span, "class", "legend svelte-dngx7s");
    			add_location(span, file$1, 74, 12, 2687);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*configs*/ 16 && t_value !== (t_value = /*configs*/ ctx[4].legend + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(74:8) {#if configs.legend}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div2;
    	let div0;
    	let t0;
    	let div1;
    	let span;
    	let t1;
    	let t2;
    	let t3;
    	let if_block = /*configs*/ ctx[4].legend && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			t0 = space();
    			div1 = element("div");
    			span = element("span");
    			t1 = text(/*showVal*/ ctx[3]);
    			t2 = text("%");
    			t3 = space();
    			if (if_block) if_block.c();
    			attr_dev(div0, "class", "gauge svelte-dngx7s");
    			add_location(div0, file$1, 69, 4, 2502);
    			attr_dev(span, "class", "display svelte-dngx7s");
    			add_location(span, file$1, 72, 8, 2604);
    			attr_dev(div1, "class", "title svelte-dngx7s");
    			add_location(div1, file$1, 71, 4, 2558);
    			attr_dev(div2, "class", "container svelte-dngx7s");
    			add_location(div2, file$1, 68, 0, 2451);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			/*div0_binding*/ ctx[7](div0);
    			append_dev(div2, t0);
    			append_dev(div2, div1);
    			append_dev(div1, span);
    			append_dev(span, t1);
    			append_dev(span, t2);
    			append_dev(div1, t3);
    			if (if_block) if_block.m(div1, null);
    			/*div1_binding*/ ctx[8](div1);
    			/*div2_binding*/ ctx[9](div2);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*showVal*/ 8) set_data_dev(t1, /*showVal*/ ctx[3]);

    			if (/*configs*/ ctx[4].legend) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(div1, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			/*div0_binding*/ ctx[7](null);
    			if (if_block) if_block.d();
    			/*div1_binding*/ ctx[8](null);
    			/*div2_binding*/ ctx[9](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Percentgauge', slots, []);
    	let { value = 0 } = $$props;
    	let { options = {} } = $$props;
    	let gauge = null;
    	let container = null;
    	let text = null;
    	let showVal = '';
    	let configs = {};

    	let defaults = {
    		bgColor: 'silver',
    		color: 'red',
    		textColor: null,
    		thickness: 10,
    		legend: '',
    		valueOverflow: false,
    		decimals: 2,
    		enforceDecimals: false
    	};

    	const resizeObserver = new ResizeObserver(update);

    	onMount(() => {
    		update();
    		resizeObserver.observe(container);
    	});

    	function update() {
    		$$invalidate(4, configs = { ...defaults, ...options });

    		if (gauge && container) {
    			container.style.setProperty('--thickness', configs.thickness + 'px');
    			container.style.setProperty('--color', configs.color);
    			container.style.setProperty('--bgcolor', configs.bgColor);
    			let compressor = 0.75;
    			let width = container.clientWidth - configs.thickness * 2;
    			let fitSize = Math.max(Math.min(width / (compressor * 9), 200), 12);
    			console.log('FITSIZE: ' + fitSize, container.clientHeight);
    			container.style.setProperty('--valueFontSize', fitSize + 'px');
    			container.style.setProperty('--legendFontSize', fitSize * 0.6 + 'px');
    			$$invalidate(2, text.style.color = configs.textColor || configs.color, text);
    			let val = value < 0 ? 0 : value > 100 ? 100 : value;
    			$$invalidate(3, showVal = (configs.valueOverflow ? value : val).toFixed(configs.decimals));

    			if (!configs.enforceDecimals && +showVal == parseInt(showVal)) {
    				$$invalidate(3, showVal = showVal.slice(0, -3));
    			}

    			let degrees = Math.round(val / 100 * 180);
    			gauge.style.setProperty('--angle', 45 + degrees + 'deg');
    		}
    	}

    	const writable_props = ['value', 'options'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<Percentgauge> was created with unknown prop '${key}'`);
    	});

    	function div0_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			gauge = $$value;
    			$$invalidate(0, gauge);
    		});
    	}

    	function div1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			text = $$value;
    			$$invalidate(2, text);
    		});
    	}

    	function div2_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			container = $$value;
    			$$invalidate(1, container);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ('value' in $$props) $$invalidate(5, value = $$props.value);
    		if ('options' in $$props) $$invalidate(6, options = $$props.options);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		value,
    		options,
    		gauge,
    		container,
    		text,
    		showVal,
    		configs,
    		defaults,
    		resizeObserver,
    		update
    	});

    	$$self.$inject_state = $$props => {
    		if ('value' in $$props) $$invalidate(5, value = $$props.value);
    		if ('options' in $$props) $$invalidate(6, options = $$props.options);
    		if ('gauge' in $$props) $$invalidate(0, gauge = $$props.gauge);
    		if ('container' in $$props) $$invalidate(1, container = $$props.container);
    		if ('text' in $$props) $$invalidate(2, text = $$props.text);
    		if ('showVal' in $$props) $$invalidate(3, showVal = $$props.showVal);
    		if ('configs' in $$props) $$invalidate(4, configs = $$props.configs);
    		if ('defaults' in $$props) defaults = $$props.defaults;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*options, value*/ 96) {
    			if (options || value != null) {
    				update();
    			}
    		}
    	};

    	return [
    		gauge,
    		container,
    		text,
    		showVal,
    		configs,
    		value,
    		options,
    		div0_binding,
    		div1_binding,
    		div2_binding
    	];
    }

    class Percentgauge extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { value: 5, options: 6 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Percentgauge",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get value() {
    		throw new Error("<Percentgauge>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<Percentgauge>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get options() {
    		throw new Error("<Percentgauge>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set options(value) {
    		throw new Error("<Percentgauge>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.55.0 */
    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let div0;
    	let h1;
    	let t1;
    	let p0;
    	let t3;
    	let div1;
    	let percentgauge;
    	let updating_options;
    	let t4;
    	let div5;
    	let button0;
    	let t6;
    	let button1;
    	let t8;
    	let br0;
    	let br1;
    	let t9;
    	let div2;
    	let input0;
    	let t10;
    	let br2;
    	let t11;
    	let input1;
    	let t12;
    	let t13;
    	let br3;
    	let t14;
    	let div3;
    	let h60;
    	let t15;
    	let t16_value = /*options*/ ctx[1].thickness + "";
    	let t16;
    	let span0;
    	let t18;
    	let input2;
    	let t19;
    	let div4;
    	let h61;
    	let t20;
    	let t21;
    	let span1;
    	let t23;
    	let input3;
    	let t24;
    	let aside;
    	let p1;
    	let t25;
    	let br4;
    	let t26;
    	let t27;
    	let br5;
    	let br6;
    	let current;
    	let mounted;
    	let dispose;

    	function percentgauge_options_binding(value) {
    		/*percentgauge_options_binding*/ ctx[7](value);
    	}

    	let percentgauge_props = { value: /*val*/ ctx[0] };

    	if (/*options*/ ctx[1] !== void 0) {
    		percentgauge_props.options = /*options*/ ctx[1];
    	}

    	percentgauge = new Percentgauge({
    			props: percentgauge_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(percentgauge, 'options', percentgauge_options_binding, /*options*/ ctx[1]));

    	const block = {
    		c: function create() {
    			main = element("main");
    			div0 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Percent Gauge";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "A Svelte component that emulates a semi circular percent based gauge";
    			t3 = space();
    			div1 = element("div");
    			create_component(percentgauge.$$.fragment);
    			t4 = space();
    			div5 = element("div");
    			button0 = element("button");
    			button0.textContent = "Change Value";
    			t6 = space();
    			button1 = element("button");
    			button1.textContent = "120%";
    			t8 = space();
    			br0 = element("br");
    			br1 = element("br");
    			t9 = space();
    			div2 = element("div");
    			input0 = element("input");
    			t10 = text("  Show overflowed value\n            ");
    			br2 = element("br");
    			t11 = space();
    			input1 = element("input");
    			t12 = text("  Generate Decimals");
    			t13 = space();
    			br3 = element("br");
    			t14 = space();
    			div3 = element("div");
    			h60 = element("h6");
    			t15 = text("Thickness - ");
    			t16 = text(t16_value);
    			span0 = element("span");
    			span0.textContent = "px";
    			t18 = space();
    			input2 = element("input");
    			t19 = space();
    			div4 = element("div");
    			h61 = element("h6");
    			t20 = text("Size - ");
    			t21 = text(/*size*/ ctx[3]);
    			span1 = element("span");
    			span1.textContent = "px";
    			t23 = space();
    			input3 = element("input");
    			t24 = space();
    			aside = element("aside");
    			p1 = element("p");
    			t25 = text("Play with the controls above or change the");
    			br4 = element("br");
    			t26 = text("viewport size to see how the gauge adapts");
    			t27 = space();
    			br5 = element("br");
    			br6 = element("br");
    			attr_dev(h1, "class", "svelte-fvoj4u");
    			add_location(h1, file, 27, 8, 562);
    			attr_dev(p0, "class", "svelte-fvoj4u");
    			add_location(p0, file, 28, 8, 593);
    			add_location(div0, file, 26, 4, 548);
    			attr_dev(div1, "class", "gauge svelte-fvoj4u");
    			add_location(div1, file, 31, 4, 693);
    			add_location(button0, file, 35, 8, 839);
    			add_location(button1, file, 36, 8, 893);
    			add_location(br0, file, 37, 8, 957);
    			add_location(br1, file, 37, 12, 961);
    			attr_dev(input0, "type", "checkbox");
    			add_location(input0, file, 39, 12, 1007);
    			add_location(br2, file, 40, 12, 1110);
    			attr_dev(input1, "type", "checkbox");
    			add_location(input1, file, 41, 12, 1127);
    			attr_dev(div2, "class", "checks svelte-fvoj4u");
    			add_location(div2, file, 38, 8, 974);
    			add_location(br3, file, 43, 8, 1232);
    			set_style(span0, "text-transform", "none");
    			add_location(span0, file, 45, 47, 1298);
    			attr_dev(h60, "class", "svelte-fvoj4u");
    			add_location(h60, file, 45, 12, 1263);
    			attr_dev(input2, "type", "range");
    			attr_dev(input2, "min", "2");
    			attr_dev(input2, "max", "32");
    			attr_dev(input2, "step", "1");
    			attr_dev(input2, "class", "svelte-fvoj4u");
    			add_location(input2, file, 46, 12, 1360);
    			add_location(div3, file, 44, 8, 1245);
    			set_style(span1, "text-transform", "none");
    			add_location(span1, file, 49, 29, 1498);
    			attr_dev(h61, "class", "svelte-fvoj4u");
    			add_location(h61, file, 49, 12, 1481);
    			attr_dev(input3, "type", "range");
    			attr_dev(input3, "min", "150");
    			attr_dev(input3, "max", "500");
    			attr_dev(input3, "step", "10");
    			attr_dev(input3, "class", "svelte-fvoj4u");
    			add_location(input3, file, 50, 12, 1560);
    			add_location(div4, file, 48, 8, 1463);
    			attr_dev(div5, "class", "cmd svelte-fvoj4u");
    			add_location(div5, file, 34, 4, 813);
    			add_location(br4, file, 54, 53, 1748);
    			attr_dev(p1, "class", "svelte-fvoj4u");
    			add_location(p1, file, 54, 8, 1703);
    			add_location(aside, file, 53, 4, 1687);
    			attr_dev(main, "class", "svelte-fvoj4u");
    			add_location(main, file, 25, 0, 537);
    			add_location(br5, file, 57, 0, 1819);
    			add_location(br6, file, 57, 4, 1823);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div0);
    			append_dev(div0, h1);
    			append_dev(div0, t1);
    			append_dev(div0, p0);
    			append_dev(main, t3);
    			append_dev(main, div1);
    			mount_component(percentgauge, div1, null);
    			/*div1_binding*/ ctx[8](div1);
    			append_dev(main, t4);
    			append_dev(main, div5);
    			append_dev(div5, button0);
    			append_dev(div5, t6);
    			append_dev(div5, button1);
    			append_dev(div5, t8);
    			append_dev(div5, br0);
    			append_dev(div5, br1);
    			append_dev(div5, t9);
    			append_dev(div5, div2);
    			append_dev(div2, input0);
    			input0.checked = /*options*/ ctx[1].valueOverflow;
    			append_dev(div2, t10);
    			append_dev(div2, br2);
    			append_dev(div2, t11);
    			append_dev(div2, input1);
    			input1.checked = /*decimals*/ ctx[4];
    			append_dev(div2, t12);
    			append_dev(div5, t13);
    			append_dev(div5, br3);
    			append_dev(div5, t14);
    			append_dev(div5, div3);
    			append_dev(div3, h60);
    			append_dev(h60, t15);
    			append_dev(h60, t16);
    			append_dev(h60, span0);
    			append_dev(div3, t18);
    			append_dev(div3, input2);
    			set_input_value(input2, /*options*/ ctx[1].thickness);
    			append_dev(div5, t19);
    			append_dev(div5, div4);
    			append_dev(div4, h61);
    			append_dev(h61, t20);
    			append_dev(h61, t21);
    			append_dev(h61, span1);
    			append_dev(div4, t23);
    			append_dev(div4, input3);
    			set_input_value(input3, /*size*/ ctx[3]);
    			append_dev(main, t24);
    			append_dev(main, aside);
    			append_dev(aside, p1);
    			append_dev(p1, t25);
    			append_dev(p1, br4);
    			append_dev(p1, t26);
    			insert_dev(target, t27, anchor);
    			insert_dev(target, br5, anchor);
    			insert_dev(target, br6, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*spin*/ ctx[5], false, false, false),
    					listen_dev(button1, "click", /*click_handler*/ ctx[9], false, false, false),
    					listen_dev(input0, "change", /*input0_change_handler*/ ctx[10]),
    					listen_dev(input1, "change", /*input1_change_handler*/ ctx[11]),
    					listen_dev(input2, "change", /*input2_change_input_handler*/ ctx[12]),
    					listen_dev(input2, "input", /*input2_change_input_handler*/ ctx[12]),
    					listen_dev(input3, "change", /*input3_change_input_handler*/ ctx[13]),
    					listen_dev(input3, "input", /*input3_change_input_handler*/ ctx[13]),
    					listen_dev(input3, "input", /*resize*/ ctx[6], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			const percentgauge_changes = {};
    			if (dirty & /*val*/ 1) percentgauge_changes.value = /*val*/ ctx[0];

    			if (!updating_options && dirty & /*options*/ 2) {
    				updating_options = true;
    				percentgauge_changes.options = /*options*/ ctx[1];
    				add_flush_callback(() => updating_options = false);
    			}

    			percentgauge.$set(percentgauge_changes);

    			if (dirty & /*options*/ 2) {
    				input0.checked = /*options*/ ctx[1].valueOverflow;
    			}

    			if (dirty & /*decimals*/ 16) {
    				input1.checked = /*decimals*/ ctx[4];
    			}

    			if ((!current || dirty & /*options*/ 2) && t16_value !== (t16_value = /*options*/ ctx[1].thickness + "")) set_data_dev(t16, t16_value);

    			if (dirty & /*options*/ 2) {
    				set_input_value(input2, /*options*/ ctx[1].thickness);
    			}

    			if (!current || dirty & /*size*/ 8) set_data_dev(t21, /*size*/ ctx[3]);

    			if (dirty & /*size*/ 8) {
    				set_input_value(input3, /*size*/ ctx[3]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(percentgauge.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(percentgauge.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(percentgauge);
    			/*div1_binding*/ ctx[8](null);
    			if (detaching) detach_dev(t27);
    			if (detaching) detach_dev(br5);
    			if (detaching) detach_dev(br6);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let val = 13;

    	let options = {
    		thickness: 25,
    		legend: 'Total',
    		color: 'orangered',
    		bgColor: '#bbb',
    		valueOverflow: true,
    		textColor: '#ffc0b5'
    	};

    	let container;
    	let size = 300;
    	let decimals = false;

    	function spin(e, v) {
    		$$invalidate(0, val = v || Math.round(Math.random() * 98) + (decimals ? Math.random() : 0));
    	}

    	function resize() {
    		$$invalidate(2, container.style.maxWidth = size + 'px', container);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function percentgauge_options_binding(value) {
    		options = value;
    		$$invalidate(1, options);
    	}

    	function div1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			container = $$value;
    			$$invalidate(2, container);
    		});
    	}

    	const click_handler = () => spin(event, 120);

    	function input0_change_handler() {
    		options.valueOverflow = this.checked;
    		$$invalidate(1, options);
    	}

    	function input1_change_handler() {
    		decimals = this.checked;
    		$$invalidate(4, decimals);
    	}

    	function input2_change_input_handler() {
    		options.thickness = to_number(this.value);
    		$$invalidate(1, options);
    	}

    	function input3_change_input_handler() {
    		size = to_number(this.value);
    		$$invalidate(3, size);
    	}

    	$$self.$capture_state = () => ({
    		Percentgauge,
    		val,
    		options,
    		container,
    		size,
    		decimals,
    		spin,
    		resize
    	});

    	$$self.$inject_state = $$props => {
    		if ('val' in $$props) $$invalidate(0, val = $$props.val);
    		if ('options' in $$props) $$invalidate(1, options = $$props.options);
    		if ('container' in $$props) $$invalidate(2, container = $$props.container);
    		if ('size' in $$props) $$invalidate(3, size = $$props.size);
    		if ('decimals' in $$props) $$invalidate(4, decimals = $$props.decimals);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		val,
    		options,
    		container,
    		size,
    		decimals,
    		spin,
    		resize,
    		percentgauge_options_binding,
    		div1_binding,
    		click_handler,
    		input0_change_handler,
    		input1_change_handler,
    		input2_change_input_handler,
    		input3_change_input_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
