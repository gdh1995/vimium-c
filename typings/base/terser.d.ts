/**
 * Source is from https://github.com/terser/terser :
 * * Terser is released under the BSD licens4e:
 * * Copyright 2012-2018 (c) Mihai Bazon <mihai.bazon@gmail.com>
 *
 * Type is learnt and then organized by Gong Dahan (gdh1995@qq.com)
 */
/// <reference no-default-lib="true"/>
/// <reference path="es.d.ts" />

import { ParseOptions, MinifyOptions, MinifyOutput, FormatOptions } from "../../node_modules/terser/tools/terser"

declare function parse(text: string, options?: ParseOptions): AST_Toplevel;

export class TreeWalker {
    constructor(callback: (this: TreeWalker, node: AST_Node, descend?: (node: AST_Node) => void) => boolean | undefined)
    directives: object;
    find_parent<T extends AST_Node>(type: { new (props?: object): T }): T | undefined;
    has_directive(type: string): boolean;
    loopcontrol_target(node: AST_Node): AST_Node | undefined;
    parent(n: number): AST_Node | undefined;
    pop(): void;
    push(node: AST_Node): void;
    self(): AST_Node | undefined;
    stack: AST_Node[];
    visit: (node: AST_Node, descend: boolean) => any;
}

export class TreeTransformer extends TreeWalker {
    constructor(
        before: (node: AST_Node, descend?: (node: AST_Node, tw: TreeWalker) => void
            , in_list?: boolean) => AST_Node | undefined,
        after?: (node: AST_Node, in_list?: boolean) => AST_Node | undefined
    );
    before: (node: AST_Node) => AST_Node;
    after?: (node: AST_Node) => AST_Node;
}

export async function minify(files: string | string[] | { [file: string]: string } | AST_Toplevel
    , options?: MinifyOptions & { format: {ast: boolean, code: boolean} }
    ): Promise<MinifyOutput & { ast: AST_Node }>;

export class AST_Node {
    constructor(props?: object);
    static BASE?: AST_Node;
    static PROPS: string[];
    static SELF_PROPS: string[];
    static SUBCLASSES: AST_Node[];
    static documentation: string;
    static propdoc?: Record<string, string>;
    static expressions?: AST_Node[];
    static warn?: (text: string, props: any) => void;
    static from_mozilla_ast?: (node: AST_Node) => any;
    walk: (visitor: TreeWalker) => void;
    transform: (tt: TreeTransformer, in_list?: boolean) => AST_Node;
    print_to_string (formatOptions?: FormatOptions): string
    TYPE: string;
    CTOR: typeof AST_Node;
}

declare class SymbolDef {
    constructor(scope?: AST_Scope, orig?: object, init?: object);
    name: string;
    orig: AST_SymbolRef[];
    init: AST_SymbolRef;
    eliminated: number;
    scope: AST_Scope;
    references: AST_SymbolRef[];
    replaced: number;
    global: boolean;
    export: boolean;
    mangled_name: null | string;
    undeclared: boolean;
    id: number;
}

declare class AST_Statement extends AST_Node {
    constructor(props?: object);
}

declare class AST_Block extends AST_Statement {
    constructor(props?: object);
    body: AST_Node[];
    block_scope: AST_Scope | null;
}

declare class AST_Scope extends AST_Block {
    constructor(props?: object);
    variables: any;
    functions: any;
    uses_with: boolean;
    uses_eval: boolean;
    parent_scope: AST_Scope | null;
    enclosed: any;
    cname: any;
}

declare class AST_Toplevel extends AST_Scope {
    constructor(props?: object);
    globals: any;
}

declare class AST_IterationStatement extends AST_Statement {
    block_scope: AST_Scope
}

declare class AST_ForIn extends AST_IterationStatement {
}

declare class AST_Binary extends AST_Node {
    operator: string
}

declare class AST_Lambda extends AST_Scope {
    constructor(props?: object);
    name: AST_SymbolDeclaration | null;
    argnames: any[]
    uses_arguments: boolean;
    is_generator: boolean;
    async: boolean;
}

declare class AST_Function extends AST_Lambda {
    constructor(props?: object);
}

declare class AST_Arrow extends AST_Lambda {
    constructor(props?: object);
}

declare class AST_Definitions extends AST_Statement {
    constructor(props?: object);
    definitions: AST_VarDef[];
}

declare class AST_Var extends AST_Definitions {
    constructor(props?: object);
    TYPE: "Var"
}

declare class AST_Let extends AST_Definitions {
    constructor(props?: object);
    TYPE: "Let"
}

declare class AST_Const extends AST_Definitions {
    constructor(props?: object);
    TYPE: "Const"
}

declare class AST_Destructuring extends AST_Node {
    constructor(props?: object);
    names: AST_Node[];
    is_array: boolean;
    all_symbols (): AST_Symbol[]
    TYPE: "Destructuring"
}
declare class AST_VarDef extends AST_Node {
    constructor(props?: object);
    name: AST_Destructuring | AST_SymbolConst | AST_SymbolLet | AST_SymbolVar;
    value: AST_Node | null;
}

declare class AST_PropAccess extends AST_Node {
    constructor(props?: object);
    expression: AST_Node;
    property: AST_Node | string;
}

declare class AST_Dot extends AST_PropAccess {
    constructor(props?: object);
}

declare class AST_Object extends AST_Node {
    constructor(props?: object);
    properties: AST_ObjectProperty[];
}

declare class AST_ObjectProperty extends AST_Node {
    constructor(props?: object);
    key: string | number | AST_Node;
    value: AST_Node;
}

declare class AST_Symbol extends AST_Node {
    constructor(props?: object);
    scope: AST_Scope;
    name: string;
    thedef: SymbolDef;
}

declare class AST_SymbolDeclaration extends AST_Symbol {
    constructor(props?: object);
    init: AST_Node | null;
    definition(): SymbolDef;
}

declare class AST_SymbolVar extends AST_SymbolDeclaration {
    constructor(props?: object);
    TYPE: "SymbolVar"
}

declare class AST_SymbolBlockDeclaration extends AST_SymbolDeclaration {
    constructor(props?: object);
}

declare class AST_SymbolConst extends AST_SymbolBlockDeclaration {
    constructor(props?: object);
    TYPE: "SymbolConst"
}

declare class AST_SymbolLet extends AST_SymbolBlockDeclaration {
    constructor(props?: object);
    TYPE: "SymbolLet"
}
declare class AST_SymbolRef extends AST_Symbol {
    constructor(props?: object);
    TYPE: "SymbolRef"
}
