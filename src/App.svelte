<script>
    import Percentgauge from './percentgauge.svelte';

	let val = 13;
    let options = {
        thickness: 25,
        legend: 'Total',
        color: 'orangered',
        bgColor: '#bbb',
        valueOverflow: true,
        textColor: '#ffc0b5'
    }
    let container;
    let size = 300;
    let decimals = false;

    function spin(e, v) {
        val = v || Math.round(Math.random() * 98) + (decimals ? Math.random() : 0); 
    }

    function resize() {
        container.style.maxWidth = size + 'px';
    }
</script>

<main>
    <div>
        <h1>Percent Gauge</h1>
        <p>A Svelte component that emulates a semi circular percent based gauge</p>        
    </div>

    <div class="gauge" bind:this={container}>
        <Percentgauge value={val} bind:options></Percentgauge>
    </div>
    <div class="cmd">
        <button on:click={spin}>Change Value</button>
        <button on:click={() => spin(event, 120)}>120%</button>
        <br><br>
        <div class="checks">
            <input type="checkbox" bind:checked={options.valueOverflow} />&nbsp; Show overflowed value
            <br>
            <input type="checkbox" bind:checked={decimals} />&nbsp; Generate Decimals        
        </div>
        <br>
        <div>
            <h6>Thickness - {options.thickness}<span style="text-transform: none">px</span></h6>
            <input type="range" min="2" max="32" step="1" bind:value={options.thickness} />
        </div>
        <div>
            <h6>Size - {size}<span style="text-transform: none">px</span></h6>
            <input type="range" min="150" max="500" step="10" bind:value={size} on:input={resize} />
        </div>        
    </div>
    <aside>
        <p>Play with the controls above or change the<br>viewport size to see how the gauge adapts</p>
    </aside>
</main>
<br><br>

<style>
    .checks {
        width: 200px;
        text-align: left;
        margin: auto;
    }
    h6 {
        margin: 0;
        text-transform: uppercase;
    }

    .cmd {
        display: block;
        margin: auto;
    }

    input[type=range] {
        width: 220px;
    }

    div.gauge {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        margin: auto;
        max-width: 300px;
        width: 100%;
        transition: all 0.4s ease;
        height: 250px;
    }




	main {
		text-align: center;
		padding: 5px;
		max-width: 700px;
        width: 100%;
		margin: 0 auto;
        height: auto;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        gap: 30px;
	}

	h1 {
		color: orangered;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
        margin: 0;
	}

    p {
        margin: 0;
        font-size: 20px;
    }
</style>