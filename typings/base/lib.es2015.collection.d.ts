/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */



/// <reference no-default-lib="true"/>


interface Map<K extends string | number | object, V> {
    clear(): void;
    delete(key: K): boolean;
    forEach(callbackfn: K extends string ? (value: V, key: K) => void : (value: V, key: K | string) => void
        , thisArg?: any): void;
    get(key: K): V | undefined;
    has(key: K): boolean;
    set(key: K, value: V): Map<K, V>;
    readonly size: number;
}

interface MapConstructor {
    new(): Map<any, any>;
    new<K, V>(entries?: readonly (readonly [K, V])[] | null): Map<K, V>;
    readonly prototype: Map<any, any>;
}
declare var Map: MapConstructor;

interface ReadonlyMap<K extends string | number, V> {
    forEach(callbackfn: (value: V, key: K) => void, thisArg?: any): void;
    get(key: K): V | undefined;
    has(key: K): boolean;
    // readonly size: number;
}

interface WeakMap<K extends object, V> {
    delete(key: K): boolean;
    get(key: K): V | undefined;
    has(key: K): boolean;
    set(key: K, value: V): unknown; // this;
}

interface WeakMapConstructor {
    new <K extends object = object, V = any>(entries?: readonly [K, V][] | null): WeakMap<K, V>;
    readonly prototype: WeakMap<object, any>;
}
declare var WeakMap: WeakMapConstructor | undefined;

interface Set<T> {
    add(value: T): Set<T>;
    clear(): void;
    delete(value: T): boolean;
    forEach(callbackfn: (value: T) => void, thisArg?: any): void;
    has(value: T): boolean;
    readonly size: number;
}

interface SetConstructor {
    new <T = any>(values?: readonly T[] | null): Set<T>;
    readonly prototype: Set<any>;
}
declare var Set: SetConstructor | undefined;

interface ReadonlySet<T> {
    forEach(callbackfn: (value: T) => void, thisArg?: any): void;
    has(value: T): boolean;
    // readonly size: number;
}

interface WeakSet<T extends object> {
    add(value: T): unknown; // this;
    delete(value: T): boolean;
    has(value: T): boolean;
}

interface WeakSetConstructor {
    new <T extends object = object>(values?: readonly T[] | null): WeakSet<T>;
    readonly prototype: WeakSet<object>;
}
declare var WeakSet: WeakSetConstructor | undefined;
interface Window {
    WeakSet?: WeakSetConstructor;
}
