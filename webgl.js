
var gl;
let verticesModel = [];
let verticesGround = [];
let activeVertices = verticesModel;


let projectionGL = null;
let modelGL = null;
let modelMatrix = IdentityMatrix();

//uv
var textures = [];
var currentTextureIndex = 0;
var textureGL = 0;
var display = [1.0, 1.0, 1.0, 0.0];
var displayGL = 0;

let mainVBO = null;


function InitWebGL()
{

    gl= document.getElementById('gl').getContext('webgl') ||
        document.getElementById('gl').getContext('experimental-webgl');

    if (!gl)
    {
        alert("WebGL is not supported by your browser.");
        return;
    }

    let canvas = document.getElementById('gl');
    if (canvas.width != canvas.clientWidth || canvas.height != canvas.clientHeight)
    {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
    }
    
    InitViewport();
}

function InitViewport()
{
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0.0, 0.4, 0.6, 1.0); 
    gl.enable(gl.DEPTH_TEST); 
    gl.enable(gl.CULL_FACE); 
    gl.cullFace(gl.BACK); 

    InitShaders();
}

function InitShaders()
{

    const vertex = InitVertexShader();
    const fragment = InitFragmentShader();


    let program = InitShaderProgram(vertex, fragment);

    if (!ValidateShaderProgram(program))
    {
        return false;
    }

    return CreateGeometryBuffers(program);
}

function InitVertexShader()
{
    let e = document.getElementById('vs')
    let vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, e.value);
    gl.compileShader(vs);

    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS))
    {

        let e = gl.getShaderInfoLog(vs);
        console.error('Failed init vertex shader: ', e)
        return;
    }
    return vs;
}

function InitFragmentShader()
{
    let e = document.getElementById('fs')
    let fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, e.value);
    gl.compileShader(fs);


    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS))
    {

        let e = gl.getShaderInfoLog(fs);
        console.error('Failed init fragmentshader: ', e)
        return;
    }
    return fs;
}

function InitShaderProgram(vs, fs)
{
    let p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);

    if (!gl.getProgramParameter(p, gl.LINK_STATUS))
    {

        console.error(gl.getProgramInfoLog(p));
        alert('Failed linking program');
        return;
    }
    return p;
}

function ValidateShaderProgram(p)
{
    gl.validateProgram(p)

    if (!gl.getProgramParameter(p, gl.VALIDATE_STATUS))
    {

        console.error(gl.getProgramInfoLog(p));
        alert('Errors found validating shader program');
        return false;
    }
    return true;
}

function CreateGeometryBuffers(program)
{
    verticesModel.splice(0, verticesModel.length); 
    activeVertices = verticesModel;
    CreateGeometryUI();

    activeVertices = verticesGround;
    CreateGroundGrid(5, 5, 100, 100, -0.1);

    vertices = verticesGround.concat(verticesModel);
    CreateVBO(program, new Float32Array(vertices));



    
    gl.useProgram(program);

    angleGL = gl.getUniformLocation(program, 'Angle');
    modelGL = gl.getUniformLocation(program, 'Model');
    projectionGL = gl.getUniformLocation(program, 'Projection');
    displayGL = gl.getUniformLocation(program, 'Display');
    textureGL = gl.getUniformLocation(program, 'Texture');
    isGridGL = gl.getUniformLocation(program, 'IsGrid');
    let twistGL = gl.getUniformLocation(program, 'TwistAmount');
    gl.uniform1f(twistGL, 0.0);
    let bendGL = gl.getUniformLocation(program, 'BendAmount');
    gl.uniform1f(bendGL, 0.0);
    let bulgeGL = gl.getUniformLocation(program, 'BulgeAmount');
    gl.uniform1f(bulgeGL, 0.0); 

    LoadTextures([
        'img/tekstur1.jpg',
        'img/tekstur2.jpg',
        'img/tekstur3.jpg',
        'img/tekstur4.jpg'
      ]);
    gl.uniform4fv(displayGL, new Float32Array(display));

    UpdateTwist();
    UpdateBend();

    UploadProjectionMatrix();
    UpdateModelMatrixFromUI();
    Render();
}

function CreateVBO(program, vert)
{
    mainVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, mainVBO);
    gl.bufferData(gl.ARRAY_BUFFER, vert, gl.STATIC_DRAW);
    const s = 11 * Float32Array.BYTES_PER_ELEMENT; 
    

    let p = gl.getAttribLocation(program, 'Pos');
    gl.vertexAttribPointer(p, 3, gl.FLOAT, gl.FALSE, s, 0); 
    gl.enableVertexAttribArray(p);

    const o = 3 * Float32Array.BYTES_PER_ELEMENT; 
    let c = gl.getAttribLocation(program, 'Color');
    gl.vertexAttribPointer(c, 3, gl.FLOAT, gl.FALSE, s, o);
    gl.enableVertexAttribArray(c); 

    let u = gl.getAttribLocation(program, 'UV');
    gl.vertexAttribPointer(u, 2, gl.FLOAT, false, s, 6 * 4);
    gl.enableVertexAttribArray(u);

    let n = gl.getAttribLocation(program, 'Normal');
    gl.vertexAttribPointer(n, 3, gl.FLOAT, gl.FALSE, s, 8 * 4);
    gl.enableVertexAttribArray(n);
}

function Render() {
    gl.clearColor(0.0, 0.1, 0.0, 0.0); 
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS); 

    const groundVertexCount = verticesGround.length / 11;
    const modelVertexCount = verticesModel.length / 11;

    const drawGridEnabled = document.getElementById('showGrid');
    const shouldDrawGrid = drawGridEnabled ? drawGridEnabled.checked : true;

    
    //grid
    if (shouldDrawGrid) {
    gl.depthMask(false); 
    gl.uniform1i(isGridGL, 1);
    gl.uniformMatrix4fv(modelGL, false, new Float32Array(IdentityMatrix()));
    gl.uniform4f(angleGL, 0.0, 0.0, 0.0, 1.0);
    gl.uniform3f(gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), 'Scale'), 1.0, 1.0, 1.0);
    drawGrid();
    gl.depthMask(true);  
    }

    //modellen
    gl.uniform1i(isGridGL, 0);
    gl.uniform4fv(displayGL, new Float32Array(display));
    gl.uniformMatrix4fv(modelGL, false, new Float32Array(modelMatrix));
    gl.uniform4fv(angleGL, new Float32Array(angle));
    gl.uniform3f(gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), 'Scale'),
             parseFloat(document.getElementById("scaleX").value),
             parseFloat(document.getElementById("scaleY").value),
             parseFloat(document.getElementById("scaleZ").value));


    if (textures.length > 0) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, textures[currentTextureIndex]);
        gl.uniform1i(textureGL, 0);
    }

    gl.drawArrays(gl.TRIANGLES, groundVertexCount, modelVertexCount);
}




function AddVertex(x, y, z, r, g, b, u, v, nx, ny, nz) {
    const index = activeVertices.length;
    activeVertices.length += 11;
    activeVertices[index + 0] = x;
    activeVertices[index + 1] = y;
    activeVertices[index + 2] = z;
    activeVertices[index + 3] = r;
    activeVertices[index + 4] = g;
    activeVertices[index + 5] = b;
    activeVertices[index + 6] = u;
    activeVertices[index + 7] = v;
    activeVertices[index + 8] = nx;
    activeVertices[index + 9] = ny;
    activeVertices[index + 10] = nz;
}

function AddTriangle(x1, y1, z1, r1, g1, b1, u1, v1,
                     x2, y2, z2, r2, g2, b2, u2, v2,
                     x3, y3, z3, r3, g3, b3, u3, v3,
                     nx, ny, nz) {

    AddVertex(x1, y1, z1, r1, g1, b1, u1, v1, nx, ny, nz);
    AddVertex(x2, y2, z2, r2, g2, b2, u2, v2, nx, ny, nz);
    AddVertex(x3, y3, z3, r3, g3, b3, u3, v3, nx, ny, nz);
}


function AddQuad(x1, y1, z1, r1, g1, b1, u1, v1,
                 x2, y2, z2, r2, g2, b2, u2, v2,
                 x3, y3, z3, r3, g3, b3, u3, v3,
                 x4, y4, z4, r4, g4, b4, u4, v4,
                 nx, ny, nz) {

    AddTriangle(x1, y1, z1, r1, g1, b1, u1, v1,
                x3, y3, z3, r3, g3, b3, u3, v3,
                x2, y2, z2, r2, g2, b2, u2, v2,
                nx, ny, nz);

    AddTriangle(x1, y1, z1, r1, g1, b1, u1, v1,
                x4, y4, z4, r4, g4, b4, u4, v4,
                x3, y3, z3, r3, g3, b3, u3, v3,
                nx, ny, nz);
}


function CreateTriangle(width, height, depth) {
    const w = width * 0.5;
    const h = height * 0.5;
    const d = depth * 0.0;

    const nx = 0;
    const ny = 0;
    const nz = 1;

    AddTriangle(
        0.0,  h, d,    1.0, 0.0, 0.0,  0.5, 1.0,  
        -w,  -h, d,    0.0, 1.0, 0.0,  0.0, 0.0,  
         w,  -h, d,    0.0, 0.0, 1.0,  1.0, 0.0, 
         nx, ny, nz                            
    );
}


function CreateQuad(width, height, depth) {
    const w = width * 0.5;
    const h = height * 0.5;
    const d = depth * 0.0;

    const nx = 0;
    const ny = 0;
    const nz = 1;

    AddQuad(
        -w,  h, d,   1.0, 0.0, 0.0,  0.0, 1.0,
         w,  h, d,   1.0, 1.0, 0.0,  1.0, 1.0,
         w, -h, d,   0.0, 0.0, 1.0,  1.0, 0.0,
        -w, -h, d,   0.0, 1.0, 0.0,  0.0, 0.0,
        nx, ny, nz  
    );
}

function CreateBox(width, height, depth) {
    const w = width * 0.5;
    const h = height * 0.5;
    const d = depth * 0.5;

    const RED     = [1.0, 0.0, 0.0];
    const GREEN   = [0.0, 1.0, 0.0];
    const BLUE    = [0.0, 0.0, 1.0];
    const ORANGE  = [1.0, 0.5, 0.0];
    const PURPLE  = [0.5, 0.0, 0.5];
    const YELLOW  = [1.0, 1.0, 0.0];

    //+Z
    AddQuad(-w, -h,  d, ...RED,    0.0, 0.0,
            -w,  h,  d, ...RED,    0.0, 1.0,
             w,  h,  d, ...RED,    1.0, 1.0,
             w, -h,  d, ...RED,    1.0, 0.0,
            0.0, 0.0, 1.0);  

    //−Z
    AddQuad( w, -h, -d, ...GREEN,  0.0, 0.0,
             w,  h, -d, ...GREEN,  0.0, 1.0,
            -w,  h, -d, ...GREEN,  1.0, 1.0,
            -w, -h, -d, ...GREEN,  1.0, 0.0,
            0.0, 0.0, -1.0); 

    //+Y
    AddQuad(-w,  h,  d, ...BLUE,   0.0, 0.0,
            -w,  h, -d, ...BLUE,   0.0, 1.0,
             w,  h, -d, ...BLUE,   1.0, 1.0,
             w,  h,  d, ...BLUE,   1.0, 0.0,
            0.0, 1.0, 0.0);

    //−Y
    AddQuad(-w, -h, -d, ...ORANGE, 0.0, 0.0,
            -w, -h,  d, ...ORANGE, 0.0, 1.0,
             w, -h,  d, ...ORANGE, 1.0, 1.0,
             w, -h, -d, ...ORANGE, 1.0, 0.0,
            0.0, -1.0, 0.0); 

    //−X
    AddQuad(-w, -h, -d, ...PURPLE, 0.0, 0.0,
            -w,  h, -d, ...PURPLE, 0.0, 1.0,
            -w,  h,  d, ...PURPLE, 1.0, 1.0,
            -w, -h,  d, ...PURPLE, 1.0, 0.0,
            -1.0, 0.0, 0.0); 

    //+X
    AddQuad( w, -h,  d, ...YELLOW, 0.0, 0.0,
             w,  h,  d, ...YELLOW, 0.0, 1.0,
             w,  h, -d, ...YELLOW, 1.0, 1.0,
             w, -h, -d, ...YELLOW, 1.0, 0.0,
             1.0, 0.0, 0.0); 
}

function CreateSubdividedBox(width, height, depth, divX, divY) {
    const dx = width / divX;
    const dy = height / divY;
    const dz = depth / divY;

    const x0 = -width / 2;
    const y0 = -height / 2;
    const z0 = depth / 2;

    const w = width / 2;
    const h = height / 2;
    const d = depth / 2;

    function CreatePlane(divA, divB, origin, stepA, stepB, invertOrder = false, flipUV = false, normal = [0, 0, 1]) {
    const useLocalUVs = document.getElementById('localUVs')?.checked;

    for (let i = 0; i < divA; i++) {
        for (let j = 0; j < divB; j++) {
            const ax = origin[0] + i * stepA[0] + j * stepB[0];
            const ay = origin[1] + i * stepA[1] + j * stepB[1];
            const az = origin[2] + i * stepA[2] + j * stepB[2];

            const bx = ax + stepA[0];
            const by = ay + stepA[1];
            const bz = az + stepA[2];

            const dx = ax + stepB[0];
            const dy = ay + stepB[1];
            const dz = az + stepB[2];

            const cx = bx + stepB[0];
            const cy = by + stepB[1];
            const cz = bz + stepB[2];

            let u0, v0, u1, v1;
            if (useLocalUVs) {
                u0 = 0; v0 = 0;
                u1 = 1; v1 = 1;
            } else {
                u0 = flipUV ? j / divB : i / divA;
                v0 = flipUV ? i / divA : j / divB;
                u1 = flipUV ? (j + 1) / divB : (i + 1) / divA;
                v1 = flipUV ? (i + 1) / divA : (j + 1) / divB;
            }

            const color = (i + j) % 2 === 0 ? [0, 0.3, 0] : [0, 1, 0];

            if (!invertOrder) {
                AddQuad(ax, ay, az, ...color, u0, v0,
                        bx, by, bz, ...color, u1, v0,
                        cx, cy, cz, ...color, u1, v1,
                        dx, dy, dz, ...color, u0, v1,
                        ...normal);
            } else {
                AddQuad(ax, ay, az, ...color, u0, v0,
                        dx, dy, dz, ...color, u1, v0,
                        cx, cy, cz, ...color, u1, v1,
                        bx, by, bz, ...color, u0, v1,
                        ...normal);
            }
        }
    }
}

    //(+Z)
    CreatePlane(divX, divY, [x0, y0,  d], [dx, 0, 0], [0, dy, 0], true, true, [0,0,1]);

    //(−Z)
    CreatePlane(divX, divY, [w, y0, -d], [-dx, 0, 0], [0, dy, 0], true, true, [0,0,-1]);  

    //(+Y)
    CreatePlane(divX, divY, [x0,  h, -d], [dx, 0, 0], [0, 0, dz], false, false, [0,1,0]);

    //(−Y)
    CreatePlane(divX, divY, [x0, -h,  d], [dx, 0, 0], [0, 0, -dz], false, false, [0,-1,0]); 

    //(−X)
    CreatePlane(divY, divX, [-w, y0, -d], [0, dy, 0], [0, 0, dz], false, false, [-1,0,0]);

    //(+X)
    CreatePlane(divY, divX, [ w, y0,  d], [0, dy, 0], [0, 0, -dz], false, false, [1,0,0]); 
}

function CreateCylinder(radius = 0.5, height = 1.0, segments = 32) {
    const h = height * 0.5;
    const color = [0.0, 0.9, 0.9];
    const normalUp = [0.0, 1.0, 0.0];
    const normalDown = [0.0, -1.0, 0.0];

    for (let i = 0; i < segments; i++) {
        const angle1 = (i / segments) * 2 * Math.PI;
        const angle2 = ((i + 1) / segments) * 2 * Math.PI;

        const x1 = Math.cos(angle1) * radius;
        const z1 = Math.sin(angle1) * radius;
        const x2 = Math.cos(angle2) * radius;
        const z2 = Math.sin(angle2) * radius;

        AddTriangle(
            0, h, 0, ...color, 0.5, 0.5,
            x2, h, z2, ...color, (x2 + 1) / 2, (z2 + 1) / 2,
            x1, h, z1, ...color, (x1 + 1) / 2, (z1 + 1) / 2,
            ...normalUp
        );

        AddTriangle(
            0, -h, 0, ...color, 0.5, 0.5,
            x1, -h, z1, ...color, (x1 + 1) / 2, (z1 + 1) / 2,
            x2, -h, z2, ...color, (x2 + 1) / 2, (z2 + 1) / 2,
            ...normalDown
        );

        const normal1 = normalizeVec3([x1, 0, z1]);
        const normal2 = normalizeVec3([x2, 0, z2]);
        const avgNormal = averageVec3(normal1, normal2);

        AddQuad(
         x2, -h, z2, ...color, (i + 1) / segments, 0.0, 
         x2,  h, z2, ...color, (i + 1) / segments, 1.0, 
         x1,  h, z1, ...color, i / segments, 1.0,       
         x1, -h, z1, ...color, i / segments, 0.0,       
         ...avgNormal
     );
    }
}


function CreateGeometryUI() {

    const ew = document.getElementById('w');
    const w = ew? ew.value: 1.0;

    const eh = document.getElementById('h');
    const h = eh ? eh.value: 1.0;

    const ed = document.getElementById('d');
    const d = ed ? parseFloat(ed.value) : 1.0;


    let dx = document.getElementById('dx');
    let dy = document.getElementById('dy');

    const divX = dx ? parseInt(dx.value) : 8;
    const divY = dy ? parseInt(dy.value) : 8;



    document.getElementById('ui').innerHTML = `
    <label>Vælg tekstur:</label><br>
    <select id="textureSelect" onchange="ChangeTexture()">
      <option value="0">Tekstur 1</option>
      <option value="1">Tekstur 2</option>
      <option value="2">Tekstur 3</option>
      <option value="3">Tekstur 4</option>
    </select><br><br></br>

    <label><input type="checkbox" id="t" onchange="Update()"> Brug tekstur</label><br>

    <label>Lysfarve: <input type="color" id="l" value="#ffffff" onchange="Update()"></label><br>

    <label><input type="checkbox" id="showGrid" checked onchange="Render()"> Vis grid</label>

    <div id="transform-ui">
      <h3>Transformation</h3>

      <div class="transform-row">
        <div class="transform-label">Scale:</div>
        <input type="number" step="0.01" id="scaleX" value="1" title="Scale X">
        <input type="number" step="0.01" id="scaleY" value="1" title="Scale Y">
        <input type="number" step="0.01" id="scaleZ" value="1" title="Scale Z">
      </div>

      <div class="transform-row">
        <div class="transform-label">Translate:</div>
        <input type="number" step="0.01" id="transX" value="0" title="Translate X">
        <input type="number" step="0.01" id="transY" value="0" title="Translate Y">
        <input type="number" step="0.01" id="transZ" value="-5" title="Translate Z">
      </div>
    </div>
    
    <div style="display: flex; align-items: center; gap: 0.5rem;">
      <label for="twist">Twist:</label>
      <input type="range" id="twist" min="-10" max="10" step="0.001" value="0" oninput="UpdateTwist()">
      <span id="twistValue">0</span>
    </div>
    
    <div style="display: flex; align-items: center; gap: 0.5rem;">
      <label for="bend">Bend:</label>
      <input type="range" id="bend" min="-2" max="2" step="0.001" value="0" oninput="UpdateBend()">
      <span id="bendValue">0</span>
    </div>

    <div style="display: flex; align-items: center; gap: 0.5rem;">
      <label for="bulge">Bulge:</label>
      <input type="range" id="bulge" min="-5" max="5" step="0.01" value="0" oninput="UpdateBulge()">
      <span id="bulgeValue">0</span>
    </div>

    `;
    ["scaleX", "scaleY", "scaleZ", "transX", "transY", "transZ"]
    .forEach(id => document.getElementById(id).addEventListener("input", UpdateModelMatrixFromUI));


    let e = document.getElementById('shape');
    switch(e.selectedIndex) {
        case 0: CreateTriangle(w, h, d); break;
        case 1: CreateQuad(w, h, d); break;
        case 2: CreateBox(w, h, d); break;
        case 3: CreateSubdividedBox(w, h, d, divX, divY); break;
        case 4: CreateCylinder(w * 0.5, h, 64); break;
    }

    [
    { id: 'scaleX', step: 0.01 },
    { id: 'scaleY', step: 0.01 },
    { id: 'scaleZ', step: 0.01 },
    { id: 'transX', step: 0.01 },
    { id: 'transY', step: 0.01 },
    { id: 'transZ', step: 0.01 }
].forEach(({ id, step }) => {
    const el = document.getElementById(id);
    if (el) makeInputDraggable(el, step);
});

}

function AddGridLine(x1, y1, z1, x2, y2, z2, r, g, b) {
    activeVertices.push(x1, y1, z1, r, g, b, 0.0, 0.0, 0.0, 1.0, 0.0);
    activeVertices.push(x2, y2, z2, r, g, b, 0.0, 0.0, 0.0, 1.0, 0.0);

}

function CreateGroundGrid(width, depth, divX, divZ, yOffset = -0.5) {
    activeVertices = verticesGround;
    verticesGround.length = 0; 

    const dx = width / divX;
    const dz = depth / divZ;

    const x0 = -width / 2;
    const z0 = -depth / 2;

    const color = [0.0, 1.0, 0.0]; 

    for (let i = 0; i <= divX; i++) {
        const x = x0 + i * dx;
        AddGridLine(x, yOffset, z0, x, yOffset, z0 + depth, ...color);
    }

    for (let j = 0; j <= divZ; j++) {
        const z = z0 + j * dz;
        AddGridLine(x0, yOffset, z, x0 + width, yOffset, z, ...color);
    }

CreateMountainGrid(-5.5, -0.4, -10, 3.5, 3.0, 30, 20, [1.0, 0.0, 1.0]);
CreateMountainGrid(-4.5, -0.6, -15, 1.5, 1.0, 20, 10, [1.0, 1.0, 0.0]);
CreateMountainGrid(-5.0, -0.5, -12, 2.8, 2.2, 20, 20, [0.0, 1.0, 1.0]);

CreateSynthwaveSun(0.0, -0.6, -15.0, 3.3, 70, [0.7, 0.0, 0.0], [1.0, 1.0, 0.0]);

    activeVertices = verticesModel;
}

function drawGrid() {
    gl.bindBuffer(gl.ARRAY_BUFFER, mainVBO);
    const stride = 11 * Float32Array.BYTES_PER_ELEMENT;

    const posLoc = gl.getAttribLocation(gl.getParameter(gl.CURRENT_PROGRAM), 'Pos');
    const colLoc = gl.getAttribLocation(gl.getParameter(gl.CURRENT_PROGRAM), 'Color');

    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(posLoc);

    gl.vertexAttribPointer(colLoc, 3, gl.FLOAT, false, stride, 3 * 4);
    gl.enableVertexAttribArray(colLoc);

    const groundVertexCount = verticesGround.length / 11;
    gl.drawArrays(gl.LINES, 0, groundVertexCount);
}

function CreateMountainGrid(centerX, baseY, centerZ, width, height, segmentsX, segmentsY, color) {
    const halfW = width * 0.5;

    for (let i = 0; i <= segmentsX; i++) {
        const t = i / segmentsX;
        const x = centerX - halfW + t * width;

        const peakX = centerX;
        const peakY = baseY + height;
        const dx = x - peakX;

        const yTop = peakY - Math.abs(dx) * (height / halfW);

        AddGridLine(x, baseY, centerZ, x, yTop, centerZ, ...color);
    }

    for (let j = 1; j <= segmentsY; j++) {
        const t = j / segmentsY;
        const y = baseY + t * height;

        const halfSpan = (1 - t) * halfW;
        const x1 = centerX - halfSpan;
        const x2 = centerX + halfSpan;

        AddGridLine(x1, y, centerZ, x2, y, centerZ, ...color);
    }
}

function CreateSynthwaveSun(cx, cy, cz, radius = 1.2, lines = 30, colorTop = [1.0, 0.0, 0.0], colorBottom = [1.0, 0.5, 0.0]) {
    for (let i = 0; i < lines; i++) {
        const t = i / lines;
        const y = cy + radius - t * radius * 2;

        if (y < cy) continue;

        const dy = y - cy;
        const halfWidth = Math.sqrt(Math.max(radius * radius - dy * dy, 0.0));
        const x1 = cx - halfWidth;
        const x2 = cx + halfWidth;

        const r = colorTop[0] * (1 - t) + colorBottom[0] * t;
        const g = colorTop[1] * (1 - t) + colorBottom[1] * t;
        const b = colorTop[2] * (1 - t) + colorBottom[2] * t;

        AddGridLine(x1, y, cz, x2, y, cz, r, g, b);
    }
}


//       modifiers


let twistVal = 0;

function UpdateTwist() {
    const slider = document.getElementById("twist");
    twistVal = parseFloat(slider.value);
    document.getElementById("twistValue").innerText = twistVal;
    
    //udskyd renderingen (ikke længere nødvendigt)
    requestAnimationFrame(() => {
        gl.uniform1f(gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), "TwistAmount"), twistVal);
        Render();
    });
}

function UpdateBend() {
    const bendSlider = document.getElementById("bend");
    const bendVal = parseFloat(bendSlider.value);
    document.getElementById("bendValue").innerText = bendVal;
    gl.uniform1f(gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), "BendAmount"), bendVal);
    Render();
}

function UpdateBulge() {
    const slider = document.getElementById("bulge");
    const value = parseFloat(slider.value);
    document.getElementById("bulgeValue").innerText = value.toFixed(2);

    gl.uniform1f(gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), "BulgeAmount"), value);
    Render();
}


//                         matricer

function UploadProjectionMatrix() {
    const fov = 45.0 * Math.PI / 180.0; 
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const near = 0.1;
    const far = 100.0;
    const f = 1.0 / Math.tan(fov / 2);
    const rangeInv = 1.0 / (near - far);

    const projection = [
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (near + far) * rangeInv, -1,
        0, 0, near * far * rangeInv * 2, 0
    ];

    gl.uniformMatrix4fv(projectionGL, false, new Float32Array(projection));
}

function IdentityMatrix() {
    return [
        1, 0, 0, 0, 
        0, 1, 0, 0, 
        0, 0, 1, 0,  
        0, 0, 0, 1
    ];
}

function SetModelMatrix(m) {
    modelMatrix = m;
    gl.uniformMatrix4fv(modelGL, false, new Float32Array(modelMatrix));
}

function TranslateMatrix(tx, ty, tz) {
    return [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        tx, ty, tz, 1
    ];
}

function ScaleMatrix(sx, sy, sz) {
    return [
        sx, 0,  0,  0,
        0,  sy, 0,  0,
        0,  0,  sz, 0,
        0,  0,  0,  1
    ];
}

function RotateXMatrix(angle) {
    const c = Math.cos(angle), s = Math.sin(angle);
    return [
        1, 0, 0, 0,
        0, c,-s, 0,
        0, s, c, 0,
        0, 0, 0, 1
    ];
}

function RotateYMatrix(angle) {
    const c = Math.cos(angle), s = Math.sin(angle);
    return [
         c, 0, s, 0,
         0, 1, 0, 0,
        -s, 0, c, 0,
         0, 0, 0, 1
    ];
}

function RotateZMatrix(angle) {
    const c = Math.cos(angle), s = Math.sin(angle);
    return [
         c,-s, 0, 0,
         s, c, 0, 0,
         0, 0, 1, 0,
         0, 0, 0, 1
    ];
}

function MultiplyMatrix(a, b) {
    const r = new Array(16).fill(0);
    for (let i = 0; i < 4; ++i)
        for (let j = 0; j < 4; ++j)
            for (let k = 0; k < 4; ++k)
                r[i * 4 + j] += a[i * 4 + k] * b[k * 4 + j];
    return r;
}


function UpdateModelMatrixFromUI() {
    const sx = parseFloat(document.getElementById("scaleX").value);
    const sy = parseFloat(document.getElementById("scaleY").value);
    const sz = parseFloat(document.getElementById("scaleZ").value);

    const tx = parseFloat(document.getElementById("transX").value);
    const ty = parseFloat(document.getElementById("transY").value);
    const tz = parseFloat(document.getElementById("transZ").value);

    const T = TranslateMatrix(tx, ty, tz);
    SetModelMatrix(T);

    gl.uniform3f(gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), 'Scale'), sx, sy, sz);

    Render();
}

function normalizeVec3(v) {
    const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    return len === 0 ? [0, 0, 0] : [v[0] / len, v[1] / len, v[2] / len];
}

function averageVec3(a, b) {
    return normalizeVec3([
        (a[0] + b[0]) * 0.5,
        (a[1] + b[1]) * 0.5,
        (a[2] + b[2]) * 0.5
    ]);
}



//                    uv 

function ChangeTexture() {
    const select = document.getElementById('textureSelect');
    currentTextureIndex = parseInt(select.value);
}

function CreateTexture(prog, url) {

    const texture = LoadTexture(url);

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    textureGL = gl.getUniformLocation(prog, 'Texture');

    displayGL = gl.getUniformLocation(prog, 'Display');
}

function LoadTexture(url) {

    const texture = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, texture);

    const pixel = new Uint8Array([0, 0, 255, 255]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, 
gl.RGBA, gl.UNSIGNED_BYTE, pixel);
   const image = new Image();
   image.onload = () => {
       gl.bindTexture(gl.TEXTURE_2D, texture);
       gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
       SetTextureFilters(image);
    };
    image.src = url;
    return texture;
}

function LoadTextures(urls) {
    textures = urls.map(url => {
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);

        const pixel = new Uint8Array([0, 0, 255, 255]);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel);

        const img = new Image();
        img.onload = () => {
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
            SetTextureFilters(img);

            Render();
        };
        img.src = url;

        return tex;
    });
}

function SetTextureFilters(image) {

    if (IsPow2(image.width) && IsPow2(image.height)) {
        gl.generateMipmap(gl.TEXTURE_2D);
    }
    else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
}
    
function IsPow2(value) {
    return(value & (value -1)) === 0;
}

function Update() {

    const t = document.getElementById('t');
    display[3] = t.checked ? 1.0 : 0.0;

     const l = document.getElementById('l');
    if (l && l.value.startsWith('#') && l.value.length === 7) {
        display[0] = parseInt(l.value.substring(1, 3), 16) / 255.0;
        display[1] = parseInt(l.value.substring(3, 5), 16) / 255.0;
        display[2] = parseInt(l.value.substring(5, 7), 16) / 255.0;
    }

    gl.uniform4fv(displayGL, new Float32Array(display));
    Render();
}




//                    mus

var angle = [ 0.0, 0.0, 0.0, 1.0 ];
var angleGL = 0;

document.getElementById('gl').addEventListener('mousemove', function(e) {
    if (typeof angleGL === 'number') return; 

    if (e.buttons == 1) {
        angle[0] += (mouseY - e.y) * 0.01;
        angle[1] += (mouseX - e.x) * 0.01;
        gl.uniform4fv(angleGL, new Float32Array(angle));
        Render();
    }
    mouseX = e.x;
    mouseY = e.y;
});

function makeInputDraggable(input, step = 0.1) {
    let dragging = false;
    let lastY = 0;

    input.addEventListener('mousedown', (e) => {
        dragging = true;
        lastY = e.clientY;
        e.preventDefault();
        input.style.cursor = 'ns-resize';

        if (document.pointerLockElement !== document.body) {
            document.body.requestPointerLock();
        }
    });

    window.addEventListener('mousemove', (e) => {
        if (dragging) {
            const delta = e.movementY;
            let current = parseFloat(input.value) || 0;
            let min = parseFloat(input.min) || -Infinity;
            let max = parseFloat(input.max) || Infinity;

            let newValue = current - delta * step;
            newValue = Math.max(min, Math.min(max, newValue));

            input.value = newValue.toFixed(2);
            input.dispatchEvent(new Event('input'));
        }
    });

    window.addEventListener('mouseup', () => {
        if (dragging) {
            dragging = false;
            input.style.cursor = 'auto';

            if (document.pointerLockElement === document.body) {
                document.exitPointerLock();
            }
        }
    });
}





