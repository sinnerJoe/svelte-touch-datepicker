
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
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
    function null_to_empty(value) {
        return value == null ? '' : value;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
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
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function stop_propagation(fn) {
        return function (event) {
            event.stopPropagation();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.wholeText !== data)
            text.data = data;
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
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
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
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
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
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
        flushing = false;
        seen_callbacks.clear();
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
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
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
    }

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
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
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
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
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
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

    /* src/Switcher.svelte generated by Svelte v3.37.0 */

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[18] = list[i];
    	return child_ctx;
    }

    // (163:3) {#each data as item }
    function create_each_block(ctx) {
    	let li;
    	let t_value = /*item*/ ctx[18] + "";
    	let t;

    	return {
    		c() {
    			li = element("li");
    			t = text(t_value);
    			attr(li, "class", "svelte-1blcqj0");
    		},
    		m(target, anchor) {
    			insert(target, li, anchor);
    			append(li, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*data*/ 1 && t_value !== (t_value = /*item*/ ctx[18] + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(li);
    		}
    	};
    }

    function create_fragment(ctx) {
    	let div2;
    	let div0;
    	let t0;
    	let ul;
    	let t1;
    	let div1;
    	let mounted;
    	let dispose;
    	let each_value = /*data*/ ctx[0];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	return {
    		c() {
    			div2 = element("div");
    			div0 = element("div");
    			t0 = space();
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t1 = space();
    			div1 = element("div");
    			attr(div0, "class", "touch-upper-cover svelte-1blcqj0");
    			attr(ul, "class", "touch-date-container svelte-1blcqj0");
    			attr(div1, "class", "touch-lower-cover svelte-1blcqj0");
    			attr(div2, "class", "touch-date-wrapper svelte-1blcqj0");
    		},
    		m(target, anchor) {
    			insert(target, div2, anchor);
    			append(div2, div0);
    			append(div2, t0);
    			append(div2, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			/*ul_binding*/ ctx[8](ul);
    			append(div2, t1);
    			append(div2, div1);

    			if (!mounted) {
    				dispose = [
    					listen(div0, "click", prevent_default(/*scrollNext*/ ctx[3])),
    					listen(div1, "click", prevent_default(/*scrollPrev*/ ctx[4])),
    					listen(div2, "mousedown", /*onMouseDown*/ ctx[2]),
    					listen(div2, "touchstart", /*onMouseDown*/ ctx[2]),
    					listen(div2, "wheel", prevent_default(/*onWheel*/ ctx[5]))
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*data*/ 1) {
    				each_value = /*data*/ ctx[0];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div2);
    			destroy_each(each_blocks, detaching);
    			/*ul_binding*/ ctx[8](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();
    	let { selected } = $$props;
    	let { data = 0 } = $$props;
    	let { type } = $$props;
    	let position = selected ? -selected * 50 : 0;
    	let offset = 0;
    	let dragging = false;
    	let itemWrapper, previousY;

    	onMount(() => {
    		setPosition();
    	});

    	afterUpdate(() => {
    		let selectedPosition = -selected * 50;

    		if (!dragging && position !== selectedPosition) {
    			position = selectedPosition;
    			setPosition();
    		}
    	});

    	function onDateChange(type, changedData) {
    		dispatch("dateChange", { type, changedData });
    	}

    	function setPosition() {
    		let itemPosition = `
      transition: transform ${Math.abs(offset) / 100 + 0.1}s;
      transform: translateY(${position}px)
    `;

    		$$invalidate(1, itemWrapper.style.cssText = itemPosition, itemWrapper);
    	}

    	function onMouseDown(event) {
    		previousY = event.touches ? event.touches[0].clientY : event.clientY;
    		dragging = true;
    		window.addEventListener("mousemove", onMouseMove);
    		window.addEventListener("mouseup", onMouseUp);
    		window.addEventListener("touchmove", onMouseMove);
    		window.addEventListener("touchend", onMouseUp);
    	}

    	function onMouseMove(event) {
    		let clientY = event.touches ? event.touches[0].clientY : event.clientY;
    		offset = clientY - previousY;
    		let maxPosition = -data.length * 50;
    		let _position = position + offset;
    		position = Math.max(maxPosition, Math.min(50, _position));
    		previousY = event.touches ? event.touches[0].clientY : event.clientY;
    		setPosition();
    	}

    	function onMouseUp() {
    		let maxPosition = -(data.length - 1) * 50;
    		let rounderPosition = Math.round((position + offset * 5) / 50) * 50;
    		let finalPosition = Math.max(maxPosition, Math.min(0, rounderPosition));
    		dragging = false;
    		position = finalPosition;
    		window.removeEventListener("mousemove", onMouseMove);
    		window.removeEventListener("mouseup", onMouseUp);
    		window.removeEventListener("touchmove", onMouseMove);
    		window.removeEventListener("touchend", onMouseUp);
    		setPosition();
    		onDateChange(type, -finalPosition / 50);
    	}

    	function scrollNext() {
    		position += 50;
    		setPosition();
    		onDateChange(type, -position / 50);
    	}

    	function scrollPrev() {
    		console.log("prev");
    		position -= 50;
    		setPosition();
    		onDateChange(type, -position / 50);
    	}

    	function onWheel(e) {
    		if (e.deltaY < 0) {
    			scrollPrev();
    		}

    		if (e.deltaY > 0) {
    			scrollNext();
    		}
    	}

    	function ul_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			itemWrapper = $$value;
    			$$invalidate(1, itemWrapper);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("selected" in $$props) $$invalidate(6, selected = $$props.selected);
    		if ("data" in $$props) $$invalidate(0, data = $$props.data);
    		if ("type" in $$props) $$invalidate(7, type = $$props.type);
    	};

    	return [
    		data,
    		itemWrapper,
    		onMouseDown,
    		scrollNext,
    		scrollPrev,
    		onWheel,
    		selected,
    		type,
    		ul_binding
    	];
    }

    class Switcher extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, { selected: 6, data: 0, type: 7 });
    	}
    }

    /* src/DatePicker.svelte generated by Svelte v3.37.0 */

    function create_if_block(ctx) {
    	let div5;
    	let div4;
    	let div3;
    	let div0;
    	let t0_value = /*date*/ ctx[0].getDate() + "";
    	let t0;
    	let t1;
    	let t2_value = /*MONTHS*/ ctx[6][/*date*/ ctx[0].getMonth()] + "";
    	let t2;
    	let t3;
    	let t4_value = /*date*/ ctx[0].getFullYear() + "";
    	let t4;
    	let t5;
    	let p;
    	let t6_value = /*WEEKDAY*/ ctx[8][/*date*/ ctx[0].getDay()] + "";
    	let t6;
    	let t7;
    	let div1;
    	let switcher0;
    	let t8;
    	let switcher1;
    	let t9;
    	let switcher2;
    	let t10;
    	let div2;
    	let button0;
    	let t12;
    	let button1;
    	let current;
    	let mounted;
    	let dispose;

    	switcher0 = new Switcher({
    			props: {
    				type: "day",
    				data: /*DAYS*/ ctx[5],
    				selected: /*date*/ ctx[0].getDate() - 1
    			}
    		});

    	switcher0.$on("dateChange", /*dateChanged*/ ctx[11]);

    	switcher1 = new Switcher({
    			props: {
    				type: "month",
    				data: /*MONTHS*/ ctx[6],
    				selected: /*date*/ ctx[0].getMonth()
    			}
    		});

    	switcher1.$on("dateChange", /*dateChanged*/ ctx[11]);

    	switcher2 = new Switcher({
    			props: {
    				type: "year",
    				data: /*YEARS*/ ctx[7],
    				selected: /*date*/ ctx[0].getYear()
    			}
    		});

    	switcher2.$on("dateChange", /*dateChanged*/ ctx[11]);

    	return {
    		c() {
    			div5 = element("div");
    			div4 = element("div");
    			div3 = element("div");
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			t2 = text(t2_value);
    			t3 = space();
    			t4 = text(t4_value);
    			t5 = space();
    			p = element("p");
    			t6 = text(t6_value);
    			t7 = space();
    			div1 = element("div");
    			create_component(switcher0.$$.fragment);
    			t8 = space();
    			create_component(switcher1.$$.fragment);
    			t9 = space();
    			create_component(switcher2.$$.fragment);
    			t10 = space();
    			div2 = element("div");
    			button0 = element("button");
    			button0.textContent = "Reset";
    			t12 = space();
    			button1 = element("button");
    			button1.textContent = "Ok";
    			attr(div0, "class", "date-line svelte-1gfjl4n");
    			attr(p, "class", "day-line svelte-1gfjl4n");
    			attr(div1, "class", "touch-date-picker svelte-1gfjl4n");
    			attr(button0, "class", "svelte-1gfjl4n");
    			attr(button1, "class", "svelte-1gfjl4n");
    			attr(div2, "class", "touch-date-reset svelte-1gfjl4n");
    			attr(div3, "class", "touch-date-wrapper svelte-1gfjl4n");
    			attr(div4, "class", "svelte-1gfjl4n");
    			attr(div5, "class", "touch-date-popup svelte-1gfjl4n");
    		},
    		m(target, anchor) {
    			insert(target, div5, anchor);
    			append(div5, div4);
    			append(div4, div3);
    			append(div3, div0);
    			append(div0, t0);
    			append(div0, t1);
    			append(div0, t2);
    			append(div0, t3);
    			append(div0, t4);
    			append(div3, t5);
    			append(div3, p);
    			append(p, t6);
    			append(div3, t7);
    			append(div3, div1);
    			mount_component(switcher0, div1, null);
    			append(div1, t8);
    			mount_component(switcher1, div1, null);
    			append(div1, t9);
    			mount_component(switcher2, div1, null);
    			append(div3, t10);
    			append(div3, div2);
    			append(div2, button0);
    			append(div2, t12);
    			append(div2, button1);
    			/*div5_binding*/ ctx[15](div5);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(button0, "click", stop_propagation(/*resetDate*/ ctx[10])),
    					listen(button1, "click", stop_propagation(/*confirmDate*/ ctx[12])),
    					listen(div5, "click", /*clickedOutside*/ ctx[13])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if ((!current || dirty & /*date*/ 1) && t0_value !== (t0_value = /*date*/ ctx[0].getDate() + "")) set_data(t0, t0_value);
    			if ((!current || dirty & /*date*/ 1) && t2_value !== (t2_value = /*MONTHS*/ ctx[6][/*date*/ ctx[0].getMonth()] + "")) set_data(t2, t2_value);
    			if ((!current || dirty & /*date*/ 1) && t4_value !== (t4_value = /*date*/ ctx[0].getFullYear() + "")) set_data(t4, t4_value);
    			if ((!current || dirty & /*date*/ 1) && t6_value !== (t6_value = /*WEEKDAY*/ ctx[8][/*date*/ ctx[0].getDay()] + "")) set_data(t6, t6_value);
    			const switcher0_changes = {};
    			if (dirty & /*DAYS*/ 32) switcher0_changes.data = /*DAYS*/ ctx[5];
    			if (dirty & /*date*/ 1) switcher0_changes.selected = /*date*/ ctx[0].getDate() - 1;
    			switcher0.$set(switcher0_changes);
    			const switcher1_changes = {};
    			if (dirty & /*date*/ 1) switcher1_changes.selected = /*date*/ ctx[0].getMonth();
    			switcher1.$set(switcher1_changes);
    			const switcher2_changes = {};
    			if (dirty & /*date*/ 1) switcher2_changes.selected = /*date*/ ctx[0].getYear();
    			switcher2.$set(switcher2_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(switcher0.$$.fragment, local);
    			transition_in(switcher1.$$.fragment, local);
    			transition_in(switcher2.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(switcher0.$$.fragment, local);
    			transition_out(switcher1.$$.fragment, local);
    			transition_out(switcher2.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div5);
    			destroy_component(switcher0);
    			destroy_component(switcher1);
    			destroy_component(switcher2);
    			/*div5_binding*/ ctx[15](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function create_fragment$1(ctx) {
    	let input;
    	let input_class_value;
    	let t;
    	let if_block_anchor;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*visible*/ ctx[1] && create_if_block(ctx);

    	return {
    		c() {
    			input = element("input");
    			t = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			attr(input, "type", "text");
    			attr(input, "class", input_class_value = "" + (null_to_empty(/*classes*/ ctx[2]) + " svelte-1gfjl4n"));
    			input.readOnly = true;
    			input.value = /*_date*/ ctx[3];
    		},
    		m(target, anchor) {
    			insert(target, input, anchor);
    			insert(target, t, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = listen(input, "focus", /*toggleVisibility*/ ctx[9]);
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (!current || dirty & /*classes*/ 4 && input_class_value !== (input_class_value = "" + (null_to_empty(/*classes*/ ctx[2]) + " svelte-1gfjl4n"))) {
    				attr(input, "class", input_class_value);
    			}

    			if (!current || dirty & /*_date*/ 8 && input.value !== /*_date*/ ctx[3]) {
    				input.value = /*_date*/ ctx[3];
    			}

    			if (/*visible*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*visible*/ 2) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(input);
    			if (detaching) detach(t);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let DAYS;
    	let { date = new Date() } = $$props;
    	let { visible = false } = $$props;
    	let { years_map = [1900, 2100] } = $$props;
    	let { classes = "" } = $$props;
    	let years_count = years_map[1] - years_map[0] + 1;

    	const MONTHS = [
    		"Jan",
    		"Feb",
    		"Mar",
    		"Apr",
    		"May",
    		"Jun",
    		"July",
    		"Aug",
    		"Sept",
    		"Oct",
    		"Nov",
    		"Dec"
    	];

    	const YEARS = new Array(years_count).fill(years_map[0]).map((v, i) => v + i);
    	const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    	const dispatch = createEventDispatcher();
    	let _date, popup, lastDate;

    	const toggleVisibility = () => {
    		if (!visible) {
    			lastDate = date;
    		}

    		$$invalidate(1, visible = !visible);
    	};

    	const resetDate = () => {
    		$$invalidate(0, date = lastDate);
    	};

    	const dateChanged = event => {
    		let { type, changedData } = event.detail;
    		let newDate = new Date();

    		if (type === "day") {
    			newDate = new Date(date.getFullYear(), date.getMonth(), changedData + 1);
    		} else if (type === "month") {
    			let maxDayInSelectedMonth = new Date(date.getFullYear(), changedData + 1, 0).getDate();
    			let day = Math.min(date.getDate(), maxDayInSelectedMonth);
    			newDate = new Date(date.getFullYear(), changedData, day);
    		} else if (type === "year") {
    			let maxDayInSelectedMonth = new Date(years_map[1] + changedData, date.getMonth() + 1, 0).getDate();
    			let day = Math.min(date.getDate(), maxDayInSelectedMonth);
    			newDate = new Date(1900 + changedData, date.getMonth(), day);
    		}

    		$$invalidate(0, date = newDate);
    		dispatch("dateChange", { date });
    	};

    	function confirmDate(event) {
    		toggleVisibility();
    		dispatch("confirmDate", { MouseEvent: event, date });
    	}

    	function clickedOutside(event) {
    		if (event.target == popup) {
    			toggleVisibility();
    		}
    	}

    	function div5_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			popup = $$value;
    			$$invalidate(4, popup);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("date" in $$props) $$invalidate(0, date = $$props.date);
    		if ("visible" in $$props) $$invalidate(1, visible = $$props.visible);
    		if ("years_map" in $$props) $$invalidate(14, years_map = $$props.years_map);
    		if ("classes" in $$props) $$invalidate(2, classes = $$props.classes);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*date*/ 1) {
    			 $$invalidate(5, DAYS = new Array(new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()).fill(1).map((v, i) => v + i));
    		}

    		if ($$self.$$.dirty & /*date*/ 1) {
    			 $$invalidate(3, _date = date.toLocaleDateString("en-US"));
    		}
    	};

    	return [
    		date,
    		visible,
    		classes,
    		_date,
    		popup,
    		DAYS,
    		MONTHS,
    		YEARS,
    		WEEKDAY,
    		toggleVisibility,
    		resetDate,
    		dateChanged,
    		confirmDate,
    		clickedOutside,
    		years_map,
    		div5_binding
    	];
    }

    class DatePicker extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
    			date: 0,
    			visible: 1,
    			years_map: 14,
    			classes: 2
    		});
    	}
    }

    /* dev/App.svelte generated by Svelte v3.37.0 */

    function create_fragment$2(ctx) {
    	let div1;
    	let div0;
    	let p;
    	let t0;
    	let t1;
    	let t2;
    	let datepicker;
    	let updating_date;
    	let current;

    	function datepicker_date_binding(value) {
    		/*datepicker_date_binding*/ ctx[2](value);
    	}

    	let datepicker_props = {};

    	if (/*date*/ ctx[0] !== void 0) {
    		datepicker_props.date = /*date*/ ctx[0];
    	}

    	datepicker = new DatePicker({ props: datepicker_props });
    	binding_callbacks.push(() => bind(datepicker, "date", datepicker_date_binding));
    	datepicker.$on("dateChange", dateChanged);
    	datepicker.$on("confirmDate", confirmDate);

    	return {
    		c() {
    			div1 = element("div");
    			div0 = element("div");
    			p = element("p");
    			t0 = text("Date: ");
    			t1 = text(/*_date*/ ctx[1]);
    			t2 = space();
    			create_component(datepicker.$$.fragment);
    			attr(div0, "class", "center svelte-q5pfva");
    			attr(div1, "class", "container svelte-q5pfva");
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			append(div1, div0);
    			append(div0, p);
    			append(p, t0);
    			append(p, t1);
    			append(div0, t2);
    			mount_component(datepicker, div0, null);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (!current || dirty & /*_date*/ 2) set_data(t1, /*_date*/ ctx[1]);
    			const datepicker_changes = {};

    			if (!updating_date && dirty & /*date*/ 1) {
    				updating_date = true;
    				datepicker_changes.date = /*date*/ ctx[0];
    				add_flush_callback(() => updating_date = false);
    			}

    			datepicker.$set(datepicker_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(datepicker.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(datepicker.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div1);
    			destroy_component(datepicker);
    		}
    	};
    }

    function dateChanged(event) {
    	console.log(event.detail);
    }

    function confirmDate(event) {
    	console.log(event.detail);
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let _date;
    	let date = new Date();

    	function datepicker_date_binding(value) {
    		date = value;
    		$$invalidate(0, date);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*date*/ 1) {
    			 $$invalidate(1, _date = date.toLocaleDateString("en-US"));
    		}
    	};

    	return [date, _date, datepicker_date_binding];
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});
    	}
    }

    const app = new App({
    	target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
