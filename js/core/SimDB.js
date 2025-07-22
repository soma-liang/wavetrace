

import {
    SimulationObject
} from './SimulationObject.js';


// enum TimeUnit {
//     'ps' = 1,
//     'ns' = 1000,
//     'us' = 1000000,
//     'ms' = 1000000000,
//     's' = 1000000000000
// }

const timeUnits = [{ key: 'ps', value: 1 },
{ key: 'ns', value: 1000 },
{ key: 'us', value: 1000000 },
{ key: 'ms', value: 1000000000 },
{ key: 's', value: 1000000000000 }]
export class SimDB {
    constructor(db) {
        this.init(db);
    }

    init(db) {
        /** @type {SimulationObject[]} */
        this.objects = [];
        /** @type {number} */
        this.now = -1;
        /** @type {number} */
        this.timePrecision = -1;
        /** @type {number} */
        this.timeUnit = -1;

        if (db) {
            db.signals.forEach(sig => {
                sig.references.forEach(ref => {
                    const hierarchy = ref.split('.')
                    this.addSignal(hierarchy, sig);
                });
            });
            this.now = db.now;
            this.timePrecision = db.gap
            this.timeUnit = db.unit
        }
    }

    convertTime(value) {
        const unitvalue=timeUnits.find(o=>o.key===this.timeUnit)?.value??1
        const baseValue = value / unitvalue;

        for (const unit of timeUnits) {
            const convertedValue = baseValue * unitvalue / unit.value;
            if (convertedValue >= 1 && convertedValue < 1000) {
                return `${convertedValue.toFixed(3).replace(/\.?0+$/, '')}${unit.key}`;
            }
        }
        return `${value}${this.timeUnit}`;
    }


    /**
     * @param {string[]} hierarchy 
     */
    addSignal(hierarchy, signal) {
        const associativeIndex = hierarchy.join('.') + '__S';
        var parent = this.addModule(hierarchy.slice(0, -1));

        const child = new SimulationObject(SimulationObject.Type.SIGNAL, hierarchy, signal, parent);
        this.objects[associativeIndex] = child;
        return child;
    }

    /**
     * @param {string[]} hierarchy 
     */
    addModule(hierarchy) {
        const associativeIndex = hierarchy.join('.');
        var parent = null;
        // if child exists:
        var child = this.getObject(hierarchy);
        if (child !== undefined) {
            return child;
        }

        if (hierarchy.length > 1) {
            parent = this.addModule(hierarchy.slice(0, -1));
        }
        child = new SimulationObject(SimulationObject.Type.MODULE, hierarchy, undefined, parent);
        this.objects[associativeIndex] = child;
        return child;
    }

    /**
     * @param {string[]} hierarchy 
     * @param {boolean} recursive 
     */
    isPathExist(hierarchy, recursive = true) {
        const associativeIndex = hierarchy.join('.');
        var ret = associativeIndex in this.objects;
        if (recursive) {
            if (hierarchy.length == 1) {
                return ret;
            }
            return ret && this.isPathExist(hierarchy.slice(0, -1));
        }
        return ret;
    }

    /**
     * @param {string[]} hierarchy 
     */
    getObject(hierarchy) {
        var associativeIndex = hierarchy;
        if (Array.isArray(hierarchy)) {
            associativeIndex = hierarchy.join('.');
        }
        return this.objects[associativeIndex];
    }

    getAllSignals() {
        const ret = []
        for (var key in this.objects) {
            if (Object.prototype.hasOwnProperty.call(this.objects, key)) {
                var obj = this.objects[key];
                if (obj.type == SimulationObject.Type.SIGNAL) {
                    ret.push(obj.signal)
                }
            }
        }
        return ret;
    }

    updateDBInitialX() {
        this.getAllSignals().forEach(element => {
            var wave = element.wave;
            if (wave.length == 0) {
                // Empty array
                wave.push({ time: 0, bin: 'x' });
                return;
            }
            if (wave[0].time != 0) {
                // Append the phantom zero-th value.
                wave.unshift({ time: 0, bin: 'x'.repeat(element.width) });
            }
        });
    }
}

