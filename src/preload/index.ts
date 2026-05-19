import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";
import { Api, CH, Options, RawEvent, ServerInfo } from "../shared/ipc";

// The contextBridge boundary requires every value exposed to the renderer
// to be cloneable; functions cross fine but listeners cannot, so push
// channels are wrapped here and the renderer only ever sees the supplied
// callback being invoked with the payload.
const api: Api = {
    getOptions: () => ipcRenderer.invoke(CH.GET_OPTIONS) as Promise<Options>,

    setFilterValidEvents: (value) =>
        ipcRenderer.invoke(CH.SET_FILTER_VALID_EVENTS, value) as Promise<void>,

    getInitialEvents: () => ipcRenderer.invoke(CH.GET_INITIAL_EVENTS) as Promise<RawEvent[]>,

    clearEvents: () => ipcRenderer.invoke(CH.CLEAR_EVENTS) as Promise<void>,

    onEvent: (cb) => {
        const listener = (_e: IpcRendererEvent, event: RawEvent) => cb(event);
        ipcRenderer.on(CH.EVENT_PUSH, listener);
        return () => {
            ipcRenderer.removeListener(CH.EVENT_PUSH, listener);
        };
    },

    onServerReady: (cb) => {
        const listener = (_e: IpcRendererEvent, info: ServerInfo) => cb(info);
        ipcRenderer.on(CH.SERVER_READY, listener);
        return () => {
            ipcRenderer.removeListener(CH.SERVER_READY, listener);
        };
    },

    window: {
        minimize: () => ipcRenderer.send(CH.WINDOW_MINIMIZE),
        maximize: () => ipcRenderer.send(CH.WINDOW_MAXIMIZE),
        close: () => ipcRenderer.send(CH.WINDOW_CLOSE),
    },
};

contextBridge.exposeInMainWorld("api", api);
