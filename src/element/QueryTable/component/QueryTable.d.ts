declare namespace svelte.JSX {
    /**
     * this interface is a ghost delcaration that simply allows the IntrinsicElements
     * interface to use the actual svelte.JSX.HTMLProps interface without tsc
     * complaining about it not being defined
     */
    interface HTMLProps<T extends EventTarget> {}
    interface HTMLAttributes<T> {}

    /**
     * Extend HTMLProps for specific HTML elements that Confluence uses
     */
    interface IntrinsicElements {
        table: HTMLProps<HTMLTableElement> & {
            resolved?: '';
        };
        // th: HTMLProps<HTMLTableHeaderCellElement> & {
        //     unselectable?: boolean | string;
        // };
    }
}