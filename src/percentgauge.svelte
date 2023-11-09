<script>
    import { onMount } from 'svelte';
    export let value = 0;
    export let options = {};

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
    }

    const resizeObserver = new ResizeObserver(update);

    $: if(options || value != null) { update();}
    
    onMount(() => {
        update();
        resizeObserver.observe(container);
    });

    function update() {
        configs = {...defaults, ...options};
        let width = 0;

        if (gauge && container) {
            container.style.setProperty('--thickness', configs.thickness + 'px');
            container.style.setProperty('--color', configs.color);
            container.style.setProperty('--bgcolor', configs.bgColor);

            let compressor = 0.75;
            let width = container.clientWidth - (configs.thickness * 2);
            let fitSize = Math.max(Math.min(width / (compressor * 9), 200), 12);
            container.style.setProperty('--valueFontSize', fitSize + 'px');
            container.style.setProperty('--legendFontSize', (fitSize * 0.6) + 'px');
            text.style.color = configs.textColor || configs.color;

            let val = value < 0 ? 0 : value > 100 ? 100 : value;
            showVal = (configs.valueOverflow ? value : val).toFixed(configs.decimals); 
            if (!configs.enforceDecimals && +showVal == parseInt(showVal)) { showVal = showVal.slice(0, -3); }
            showVal = (+showVal).toLocaleString();

            let degrees = Math.round((val / 100) * 180);
            gauge.style.setProperty('--angle', 45 + degrees + 'deg');            
        }        
    }

</script>

<div class="container" bind:this={container}>
    <div class="gauge" bind:this={gauge}></div> 
    
    <div class="title" bind:this={text}>
        <span class="display">{showVal}%</span>
        {#if configs.legend}
            <span class="legend">{configs.legend}</span>
        {/if}
    </div>
</div>

<style>
    .container {
        --angle: 45deg;
        --thickness: 10px;
        --color: red;
        --bgcolor: silver;      
        --valueFontSize: 30px;  
        --legendFontSize: 14px;
        aspect-ratio: 2 / 1;
        overflow: hidden;
        position: relative;
        width: 100%;
        box-sizing: border-box;
    }
    .gauge {
        background: transparent;
        border: var(--thickness) solid var(--bgcolor);
        border-radius: 50%;
        height: 200%;
        position: relative;
        width: 100%;
        box-sizing: border-box;
    }

    .gauge::before {
        content: '';
        border: var(--thickness) solid var(--color);
        border-left-color: transparent;
        border-radius: 50%;
        border-top-color: transparent;
        height: calc(100% + (var(--thickness) * 2));
        left: calc(var(--thickness) * -1);
        position: absolute;
        top: calc(var(--thickness) * -1);
        transform: rotate(var(--angle));
        width: calc(100% + (var(--thickness) * 2));
        z-index: 2;
        box-sizing: border-box;
        transition: transform 0.2s ease;
    }


    .title {
        color: var(--color);
        left: 50%;
        bottom: 0;
        position: absolute;
        transform: translateX(-50%);
        display: flex;
        flex-direction: column;
        width: calc(100% - (var(--thickness) * 4));
        box-sizing: border-box;        
    }

    .legend {
        font-size: var(--legendFontSize);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .display {
        font-size: var(--valueFontSize); /* calc(12px + 5vmin) */;
        font-weight: bold;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
    }
</style>