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


/////////////////////////////
/// ECMAScript APIs
/////////////////////////////

/// <reference path="lib.es2015.symbol.d.ts" />

interface SymbolConstructor {
    /**
     * A method that returns the default iterator for an object. Called by the semantics of the
     * for-of statement.
     */
    readonly iterator: symbol;

    /**
     * A regular expression method that matches the regular expression against a string. Called
     * by the String.prototype.match method.
     */
    readonly match: symbol;
}

interface IteratorYieldResult<TYield> {
	done?: false;
	value: TYield;
}

interface IteratorReturnResult<TReturn> {
	done: true;
	value: TReturn;
}

type IteratorResult<T, TReturn = any> = IteratorYieldResult<T> | IteratorReturnResult<TReturn>;

interface Iterator<T, TReturn = any, TNext = undefined> {
	// NOTE: 'next' is defined using a tuple to ensure we report the correct assignability errors in all places.
	next(...args: [] | [TNext]): IteratorResult<T, TReturn>;
	return?(value?: TReturn): IteratorResult<T, TReturn>;
	throw?(e?: any): IteratorResult<T, TReturn>;
}

interface Generator<T = unknown, TReturn = any, TNext = unknown> extends Iterator<T, TReturn, TNext> {
	// NOTE: 'next' is defined using a tuple to ensure we report the correct assignability errors in all places.
	next(...args: [] | [TNext?]): IteratorResult<T, TReturn>;
	return(value: TReturn): IteratorResult<T, TReturn>;
	throw(e: any): IteratorResult<T, TReturn>;
	[Symbol.iterator](): Generator<T, TReturn, TNext>;
}

interface Iterable<T> {
    [Symbol.iterator](): Iterator<T>;
}

interface IterableIterator<T> extends Iterator<T> {
    [Symbol.iterator](): IterableIterator<T>;
}

interface Array<T> {
    /** Iterator */
    [Symbol.iterator](): IterableIterator<T>;
    includes? (valueToFind: T): boolean;
}

interface ReadonlyArrayWithIncludes<T> extends ReadonlyArray<T> {
    includes (valueToFind: T): boolean;
}

interface ReadonlyArray<T> {
    /** Iterator of values in the array. */
    [Symbol.iterator](): IterableIterator<T>;
}

interface String {
    /** Iterator */
    [Symbol.iterator](): IterableIterator<string>;
}
