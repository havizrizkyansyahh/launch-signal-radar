// Single implementation: the browser-visible engine is also the Node data engine.
import '../dashboard/model.js';
export const { classifyTokenRecord, parseSnapshot, calibratePeers, valueProtocol,
  productRisks, farmPlan, buildRadar, validateBoard, dataScript } = globalThis.LaunchModel;
