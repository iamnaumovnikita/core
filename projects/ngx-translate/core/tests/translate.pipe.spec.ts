import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Injectable,
  Provider, Type,
  ViewContainerRef
} from "@angular/core";
import {TestBed} from "@angular/core/testing";
import {Observable, of, timer} from "rxjs";
import {
  DefaultLangChangeEvent,
  LangChangeEvent,
  MissingTranslationHandler,
  MissingTranslationHandlerParams,
  TranslateLoader,
  TranslateModule,
  TranslatePipe,
  TranslateService
} from "../src/public_api";
import {map} from "rxjs/operators";

class FakeChangeDetectorRef extends ChangeDetectorRef {
  markForCheck(): void {
  }

  detach(): void {
  }

  detectChanges(): void {
  }

  checkNoChanges(): void {
  }

  reattach(): void {
  }
}

@Injectable()
@Component({
  selector: 'hmx-app',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `{{'TEST' | translate}}`
})
class App {
  viewContainerRef: ViewContainerRef;

  constructor(viewContainerRef: ViewContainerRef) {
    this.viewContainerRef = viewContainerRef;
  }
}

let translations: any = {"TEST": "This is a test"};

class FakeLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<any> {
    return of(translations);
  }
}

class DelayedFrenchLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<any> {
    return lang === 'fr' ? timer(10).pipe(map(() => translations)) : of(translations);
  }
}

describe('TranslatePipe', () => {
  let translate: TranslateService;
  let translatePipe: TranslatePipe;
  let ref: any;

  class MissingObs implements MissingTranslationHandler {
    handle(params: MissingTranslationHandlerParams): Observable<any> {
      return timer(1).pipe(map(() => `handled: ${params.key}`));
    }
  }

  const prepare = ({handlerClass, loaderClass}: {handlerClass?: Type<any>; loaderClass?: Type<any>} = {}) => {
    const providers: Provider[] = handlerClass ? [{provide: MissingTranslationHandler, useClass: handlerClass}] : [];
    const loader: Provider = { provide: TranslateLoader, useClass: loaderClass ?? FakeLoader };

    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot({
        loader,
        useDefaultLang: !handlerClass
      })],
      declarations: [App],
      providers
    });
    translate = TestBed.inject(TranslateService);
    ref = new FakeChangeDetectorRef();
    translatePipe = new TranslatePipe(translate, ref);
  };

  afterEach(() => {
    translations = {"TEST": "This is a test"};
    ref = undefined;
  });

  it('is defined', () => {
    prepare();
    expect(TranslatePipe).toBeDefined();
    expect(translatePipe).toBeDefined();
    expect(translatePipe instanceof TranslatePipe).toBeTruthy();
  });

  it('should translate a string', () => {
    prepare();
    translate.setTranslation('en', {"TEST": "This is a test"});
    translate.use('en');

    expect(translatePipe.transform('TEST')).toEqual("This is a test");
  });

  it('should call markForChanges when it translates a string', () => {
    prepare();
    translate.setTranslation('en', {"TEST": "This is a test"});
    translate.use('en');
    jest.spyOn(ref, 'markForCheck');

    translatePipe.transform('TEST');
    expect(ref.markForCheck).toHaveBeenCalled();
  });

  it('should translate a string with object parameters', () => {
    prepare();
    translate.setTranslation('en', {"TEST": "This is a test {{param}}"});
    translate.use('en');

    expect(translatePipe.transform('TEST', {param: "with param"})).toEqual("This is a test with param");
  });

  it('should translate a string with object as string parameters', () => {
    prepare();
    translate.setTranslation('en', {"TEST": "This is a test {{param}}"});
    translate.use('en');

    expect(translatePipe.transform('TEST', '{param: "with param"}')).toEqual("This is a test with param");
    expect(translatePipe.transform('TEST', '{"param": "with param"}')).toEqual("This is a test with param");
    expect(translatePipe.transform('TEST', "{param: 'with param'}")).toEqual("This is a test with param");
    expect(translatePipe.transform('TEST', "{'param' : 'with param'}")).toEqual("This is a test with param");
  });

  it('should translate a string with object as multiple string parameters', () => {
    prepare();
    translate.setTranslation('en', {"TEST": "This is a test {{param1}} {{param2}}"});
    translate.use('en');

    expect(translatePipe.transform('TEST', '{param1: "with param-1", param2: "and param-2"}'))
      .toEqual("This is a test with param-1 and param-2");
    expect(translatePipe.transform('TEST', '{"param1": "with param-1", "param2": "and param-2"}'))
      .toEqual("This is a test with param-1 and param-2");
    expect(translatePipe.transform('TEST', "{param1: 'with param-1', param2: 'and param-2'}"))
      .toEqual("This is a test with param-1 and param-2");
    expect(translatePipe.transform('TEST', "{'param1' : 'with param-1', 'param2': 'and param-2'}"))
      .toEqual("This is a test with param-1 and param-2");
  });

  it('should translate a string with object as nested string parameters', () => {
    prepare();
    translate.setTranslation('en', {"TEST": "This is a test {{param.one}} {{param.two}}"});
    translate.use('en');

    expect(translatePipe.transform('TEST', '{param: {one: "with param-1", two: "and param-2"}}'))
      .toEqual("This is a test with param-1 and param-2");
    expect(translatePipe.transform('TEST', '{"param": {"one": "with param-1", "two": "and param-2"}}'))
      .toEqual("This is a test with param-1 and param-2");
    expect(translatePipe.transform('TEST', "{param: {one: 'with param-1', two: 'and param-2'}}"))
      .toEqual("This is a test with param-1 and param-2");
    expect(translatePipe.transform('TEST', "{'param' : {'one': 'with param-1', 'two': 'and param-2'}}"))
      .toEqual("This is a test with param-1 and param-2");
  });

  it('should update the value when the parameters change', () => {
    prepare();
    translate.setTranslation('en', {"TEST": "This is a test {{param}}"});
    translate.use('en');

    jest.spyOn(translatePipe, 'updateValue');
    jest.spyOn(ref, 'markForCheck');

    expect(translatePipe.transform('TEST', {param: "with param"})).toEqual("This is a test with param");
    // same value, shouldn't call 'updateValue' again
    expect(translatePipe.transform('TEST', {param: "with param"})).toEqual("This is a test with param");
    // different param, should call 'updateValue'
    expect(translatePipe.transform('TEST', {param: "with param2"})).toEqual("This is a test with param2");
    expect(translatePipe.updateValue).toHaveBeenCalledTimes(2);
    expect(ref.markForCheck).toHaveBeenCalledTimes(2);
  });

  it("should throw if you don't give an object parameter", () => {
    prepare();
    translate.setTranslation('en', {"TEST": "This is a test {{param}}"});
    translate.use('en');
    let param = 'param: "with param"';

    expect(() => {
      translatePipe.transform('TEST', param);
    }).toThrowError(`Wrong parameter in TranslatePipe. Expected a valid Object, received: ${param}`);
  });

  it("should return given falsey or non length query", () => {
    prepare();
    translate.setTranslation('en', {"TEST": "This is a test"});
    translate.use('en');

    expect(translatePipe.transform(null as any)).toBeNull();
    expect(translatePipe.transform(undefined as any)).toBeUndefined();
    expect(translatePipe.transform(1234 as any)).toBe(1234);
  });

  describe('should update translations on lang change', () => {
    it('with fake loader', (done) => {
      prepare();
      translate.setTranslation('en', {"TEST": "This is a test"});
      translate.setTranslation('fr', {"TEST": "C'est un test"});
      translate.use('en');

      expect(translatePipe.transform('TEST')).toEqual("This is a test");

      // this will be resolved at the next lang change
      let subscription = translate.onLangChange.subscribe((res: LangChangeEvent) => {
        expect(res.lang).toEqual('fr');
        expect(translatePipe.transform('TEST')).toEqual("C'est un test");
        subscription.unsubscribe();
        done();
      });

      translate.use('fr');
    });

    it('without proper key', (done) => {
      prepare({ handlerClass: MissingObs, loaderClass: DelayedFrenchLoader });
      translate.use('en');
      expect(translatePipe.transform('nonExistingKey')).toEqual("");

      // this will be resolved at the next lang change
      const subscription = translate.onLangChange.subscribe((res: DefaultLangChangeEvent) => {
          expect(res.lang).toEqual('fr');
          expect(translatePipe.transform('nonExistingKey')).toEqual("handled: nonExistingKey");
          subscription.unsubscribe();
          done();
      });

      translations = {"TEST": "C'est un test"};
      translate.use('fr');
    })

    it('with file loader', (done) => {
      prepare();
      translate.use('en');
      expect(translatePipe.transform('TEST')).toEqual("This is a test");

      // this will be resolved at the next lang change
      let subscription = translate.onLangChange.subscribe((res: LangChangeEvent) => {
        // let it update the translations
        setTimeout(() => {
          expect(res.lang).toEqual('fr');
          expect(translatePipe.transform('TEST')).toEqual("C'est un test");
          subscription.unsubscribe();
          done();
        });
      });

      translations = {"TEST": "C'est un test"};
      translate.use('fr');
    });

    it('should detect changes with OnPush', () => {
      prepare();
      let fixture = (<any>TestBed).createComponent(App);
      fixture.detectChanges();
      expect(fixture.debugElement.nativeElement.innerHTML).toEqual("TEST");
      translate.use('en');
      fixture.detectChanges();
      expect(fixture.debugElement.nativeElement.innerHTML).toEqual("This is a test");
    });
  });

  describe('should update translations on default lang change', () => {
    it('with fake loader', (done) => {
      prepare();
      translate.setTranslation('en', {"TEST": "This is a test"});
      translate.setTranslation('fr', {"TEST": "C'est un test"});
      translate.setDefaultLang('en');

      expect(translatePipe.transform('TEST')).toEqual("This is a test");

      // this will be resolved at the next lang change
      let subscription = translate.onDefaultLangChange.subscribe((res: DefaultLangChangeEvent) => {
        expect(res.lang).toEqual('fr');
        expect(translatePipe.transform('TEST')).toEqual("C'est un test");
        subscription.unsubscribe();
        done();
      });

      translate.setDefaultLang('fr');
    });

    it('with file loader', (done) => {
      prepare();
      translate.setDefaultLang('en');
      expect(translatePipe.transform('TEST')).toEqual("This is a test");

      // this will be resolved at the next lang change
      let subscription = translate.onDefaultLangChange.subscribe((res: DefaultLangChangeEvent) => {
        // let it update the translations
        setTimeout(() => {
          expect(res.lang).toEqual('fr');
          expect(translatePipe.transform('TEST')).toEqual("C'est un test");
          subscription.unsubscribe();
          done();
        });
      });

      translations = {"TEST": "C'est un test"};
      translate.setDefaultLang('fr');
    });

    it('should detect changes with OnPush', () => {
      prepare();
      let fixture = (<any>TestBed).createComponent(App);
      fixture.detectChanges();
      expect(fixture.debugElement.nativeElement.innerHTML).toEqual("TEST");
      translate.setDefaultLang('en');
      fixture.detectChanges();
      expect(fixture.debugElement.nativeElement.innerHTML).toEqual("This is a test");
    });
  });
});
