import * as React from 'react';
import {ReactSurveyModel} from "./reactsurveymodel";
import {SurveyPage} from "./reactpage";
import {SurveyNavigation} from "./reactSurveyNavigation";
import {QuestionBase} from "../questionbase";
import {ISurveyCreator} from "./reactquestion";
import {ReactQuestionFactory} from "./reactquestionfactory";
import {surveyCss} from "../defaultCss/cssstandard";
import {SurveyProgress} from "./reactSurveyProgress";
import {SurveyElementBase} from "./reactquestionelement";

export class Survey extends React.Component<any, any> implements ISurveyCreator {
    public static get cssType(): string { return surveyCss.currentType; }
    public static set cssType(value: string) { surveyCss.currentType = value; }
    protected survey: ReactSurveyModel;
    private isCurrentPageChanged: boolean = false;
    constructor(props: any) {
        super(props);
        this.handleTryAgainClick = this.handleTryAgainClick.bind(this);
        this.state = this.getState();
        this.updateSurvey(props);
    }
    componentWillReceiveProps(nextProps: any) {
        this.setState(this.getState());
        this.updateSurvey(nextProps);
    }
    componentDidUpdate() {
        if (this.isCurrentPageChanged) {
            this.isCurrentPageChanged = false;
            if (this.survey.focusFirstQuestionAutomatic) {
                this.survey.focusFirstQuestion();
            }
        }
    }
    componentDidMount() {
        var el = this.refs["root"];
        if (el && this.survey) this.survey.doAfterRenderSurvey(el);
    }
    render(): JSX.Element {
        if (this.survey.state == "completed") return this.renderCompleted();
        if (this.survey.state == "completedbefore") return this.renderCompletedBefore();
        if (this.survey.state == "loading") return this.renderLoading();
        return this.renderSurvey();
    }
    public get css(): any { return surveyCss.getCss(); }
    public set css(value: any) {
        this.survey.mergeCss(value, this.css);
    }
    handleTryAgainClick(event) {
        this.survey.doComplete();
    }
    protected renderCompleted(): JSX.Element {
        if(!this.survey.showCompletedPage) return null;
        var completedState = null;
        if(this.survey.completedState) {
            var tryAgainButton = null;
            if(this.survey.completedState == "error") {
                var btnText = this.survey.getLocString('saveAgainButton');
                tryAgainButton = (<input type={"button"} value={btnText} className={this.css.saveData.saveAgainButton} onClick={this.handleTryAgainClick} />);
            }
            var css = this.css.saveData[this.survey.completedState];
            completedState = <div className={this.css.saveData.root}><div className={css}><span>{this.survey.completedStateText}</span>{tryAgainButton}</div></div>;
        }
        var htmlValue = { __html: this.survey.processedCompletedHtml };
        return (<div><div dangerouslySetInnerHTML={htmlValue} />{completedState}</div>);
    }
    protected renderCompletedBefore(): JSX.Element {
        var htmlValue = { __html: this.survey.processedCompletedBeforeHtml };
        return (<div dangerouslySetInnerHTML={htmlValue} />);
    }
    protected renderLoading(): JSX.Element {
        var htmlValue = { __html: this.survey.processedLoadingHtml };
        return (<div dangerouslySetInnerHTML={htmlValue} />);
    }
    protected renderSurvey(): JSX.Element {
        var title = this.survey.title && this.survey.showTitle ? this.renderTitle() : null;
        var currentPage = this.survey.currentPage ? this.renderPage() : null;
        var pageId = this.survey.currentPage ? this.survey.currentPage.id : "";
        var topProgress = this.survey.showProgressBar == "top" ? this.renderProgress(true) : null;
        var bottomProgress = this.survey.showProgressBar == "bottom" ? this.renderProgress(false) : null;
        var buttons = (currentPage && this.survey.isNavigationButtonsShowing) ? this.renderNavigation() : null;
        if (!currentPage) {
            currentPage = this.renderEmptySurvey();
        }
        return (
            <div ref="root" className={this.css.root}>
                {title}
                <div id={pageId} className={this.css.body}>
                    {topProgress}
                    {currentPage}
                    {bottomProgress}
                </div>
                {buttons}
            </div>
        );
    }
    protected renderTitle(): JSX.Element {
        var title = SurveyElementBase.renderLocString(this.survey.locTitle);
        return <div className={this.css.header}><h3>{title}</h3></div>;
    }
    protected renderPage(): JSX.Element {
        return <SurveyPage survey={this.survey} page={this.survey.currentPage} css={this.css} creator={this} />;
    }
    protected renderProgress(isTop: boolean): JSX.Element {
        return <SurveyProgress survey={this.survey} css={this.css} isTop={isTop}  />;
    }
    protected renderNavigation(): JSX.Element {
        return <SurveyNavigation survey = {this.survey} css={this.css}/>;
    }
    protected renderEmptySurvey(): JSX.Element {
        return (<span>{this.survey.emptySurveyText}</span>);
    }
    
    protected updateSurvey(newProps: any) {
        if (newProps) {
            if (newProps.model) {
                this.survey = newProps.model;
            } else {
                if (newProps.json) {
                    this.survey = new ReactSurveyModel(newProps.json);
                }
            }
        } else {
            this.survey = new ReactSurveyModel();
        }
        if (newProps) {
            for(var key in newProps) {
                if(key == "model" || key == "children") continue;
                if(key == "css") {
                    this.survey.mergeCss(newProps.css, this.css);
                    continue;
                }
                if(key.indexOf("on") == 0 && this.survey[key] && this.survey[key].add) {
                    let funcBody = newProps[key];
                    let func = function(sender, options) { funcBody(sender, options); };
                    this.survey[key].add(func);
                } else {
                    this.survey[key] = newProps[key];
                }
            }
        }

        //set the first page
        var dummy = this.survey.currentPage;

        this.setSurveyEvents(newProps);
    }
    private getState() { return { pageIndexChange: 0, isCompleted: false, modelChanged: 0 }; }
    protected setSurveyEvents(newProps: any) {
        var self = this;
        this.survey.renderCallback = function () {
            self.state.modelChanged = self.state.modelChanged + 1;
            self.setState(self.state);
        };
        this.survey.onComplete.add((sender) => { self.state.isCompleted = true; self.setState(self.state); });
        this.survey.onPartialSend.add((sender) => { self.setState(self.state); });
        this.survey.onCurrentPageChanged.add((sender, options) => {
            self.isCurrentPageChanged = true;
            self.state.pageIndexChange = self.state.pageIndexChange + 1;
            self.setState(self.state);
            if (newProps && newProps.onCurrentPageChanged) newProps.onCurrentPageChanged(sender, options);
        });
        this.survey.onVisibleChanged.add((sender, options) => {
            if (options.question && options.question.react) {
                var state = options.question.react.state;
                state.visible = options.question.visible;
                options.question.react.setState(state);
            }
        });
        this.survey.onValueChanged.add((sender, options) => {
            if (options.question && options.question.react) {
                var state = options.question.react.state;
                state.value = options.value;
                options.question.react.setState(state);
            }
            if (newProps && newProps.data) newProps.data[options.name] = options.value;
        });
    }

    //ISurveyCreator
    public createQuestionElement(question: QuestionBase): JSX.Element {
        return ReactQuestionFactory.Instance.createQuestion(question.getTemplate(), {
            question: question, isDisplayMode: question.isReadOnly, creator: this
        });
    }
    public renderError(key: string, errorText: string, cssClasses: any): JSX.Element {
        return <div key={key} className={cssClasses.error.item}>{errorText}</div>;
    }
    public questionTitleLocation(): string { return this.survey.questionTitleLocation; }
    public questionErrorLocation(): string { return this.survey.questionErrorLocation; }
}
