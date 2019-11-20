import RedTypeSize from "../RedTypeSize.js";

export default class RedRender {
	constructor() {
	}

	render(time, redGPU, depthTextureView) {
		const swapChainTexture = redGPU.swapChain.getCurrentTexture();
		const commandEncoder = redGPU.device.createCommandEncoder();
		const textureView = swapChainTexture.createView();
		// console.log(swapChain.getCurrentTexture())
		const renderPassDescriptor = {
			colorAttachments: [{
				attachment: textureView,
				loadValue: {r: 1, g: 1, b: 0.0, a: 1.0}
			}],
			depthStencilAttachment: {
				attachment: depthTextureView,
				depthLoadValue: 1.0,
				depthStoreOp: "store",
				stencilLoadValue: 0,
				stencilStoreOp: "store",
			}
		};
		const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

		let i = redGPU.children.length;
		let prevPipeline;
		let prevVertexBuffer;
		let prevIndexBuffer;
		let prevBindBuffer;
		let tMaterial;
		let tMesh
		// 시스템 유니폼 업데이트
		redGPU.updateSystemUniform(passEncoder);

		while (i--) {
			tMesh = redGPU.children[i];
			tMaterial = tMesh.material;
			if (tMesh.dirtyTransform) {
				tMesh.getTransform();
				tMesh.getNormalTransform()
				// TODO 유니폼 버퍼를 동적생성하는 부분을 잘생각해야함
				tMesh.updateUniformBuffer();
				tMesh.dirtyTransform = false
			}


			if (!tMesh.pipeline || tMesh._prevBindings != tMaterial.bindings) tMesh.createPipeline(redGPU);

			if (prevPipeline != tMesh.pipeline) passEncoder.setPipeline(prevPipeline = tMesh.pipeline);
			if (prevVertexBuffer != tMesh.geometry.interleaveBuffer) passEncoder.setVertexBuffer(0, prevVertexBuffer = tMesh.geometry.interleaveBuffer.buffer);
			if (prevIndexBuffer != tMesh.geometry.indexBuffer) passEncoder.setIndexBuffer(prevIndexBuffer = tMesh.geometry.indexBuffer.buffer);

			if (tMaterial.bindings) {
				if (!tMesh.uniformBindGroup) {
					tMaterial.bindings[0]['resource']['buffer'] = tMesh.uniformBuffer;
					tMesh.uniformBindGroup = redGPU.device.createBindGroup(tMaterial.uniformBindGroupDescriptor)
				}
				if (prevBindBuffer != tMesh.uniformBindGroup) passEncoder.setBindGroup(1, prevBindBuffer = tMesh.uniformBindGroup);
				passEncoder.drawIndexed(tMesh.geometry.indexBuffer.indexNum, 1, 0, 0, 0);

			} else {
				tMesh.uniformBindGroup = null
				tMesh.pipeline = null
			}
			tMesh._prevBindings = tMaterial.bindings


		}
		passEncoder.endPass();

		const test = commandEncoder.finish();
		redGPU.device.defaultQueue.submit([test]);

	}
}